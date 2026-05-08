/**
 * Vercel connector.
 * Required env / config:
 *   VERCEL_TOKEN      - Vercel API token
 *   VERCEL_TEAM_ID    - optional, for team deployments
 *
 * Joel uses Vercel to:
 *   1. Trigger preview deployments when he pushes a branch
 *   2. Get the preview URL to include in approval requests
 *   3. Capture a screenshot of the preview for the approval message
 */

import type {
  DeploymentIntegration,
  OperationResult,
  DeployParams,
  DeploymentStatus,
  ScreenshotResult,
} from "../../types.js";

interface VercelSettings {
  token: string;
  teamId?: string;
  screenshotApiUrl?: string; // optional external screenshot service URL
}

class VercelIntegration implements DeploymentIntegration {
  id = "vercel";
  private token: string;
  private teamId?: string;
  private screenshotApiUrl?: string;

  constructor(settings: VercelSettings) {
    this.token = settings.token;
    this.teamId = settings.teamId;
    this.screenshotApiUrl = settings.screenshotApiUrl;
  }

  async triggerDeployment(params: DeployParams): Promise<OperationResult> {
    // Vercel auto-deploys on push via git integration.
    // This finds or triggers the deployment for a given branch.
    const qs = new URLSearchParams({ projectId: params.projectId });
    if (this.teamId) qs.set("teamId", this.teamId);
    qs.set("target", params.environment === "production" ? "production" : "preview");

    const data = await this.vercelApi(`v6/deployments?${qs}`, "GET");
    const deployments = (data.deployments as Record<string, unknown>[]) ?? [];

    // Find the most recent deployment for this branch
    const match = deployments.find(
      d => (d.meta as Record<string, string>)?.githubCommitRef === params.branch,
    );

    if (match) {
      return {
        success: true,
        integrationId: this.id,
        operationId: "trigger_deployment",
        externalRef: match.uid as string,
        summary: `Found existing deployment for branch ${params.branch}`,
        data: { deploymentId: match.uid },
      };
    }

    // No deployment yet - this happens when the branch was just pushed.
    // Vercel's git integration will pick it up shortly.
    return {
      success: true,
      integrationId: this.id,
      operationId: "trigger_deployment",
      externalRef: `pending:${params.branch}`,
      summary: `Deployment for ${params.branch} not found yet - will poll`,
      data: { pending: true, branch: params.branch, projectId: params.projectId },
    };
  }

  async getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus> {
    // Handle the pending case - poll by branch name
    if (deploymentId.startsWith("pending:")) {
      const branch = deploymentId.replace("pending:", "");
      return this.pollByBranch(branch);
    }

    const qs = this.teamId ? `?teamId=${this.teamId}` : "";
    const data = await this.vercelApi(`v13/deployments/${deploymentId}${qs}`, "GET");

    return {
      id: deploymentId,
      state: mapVercelState(data.status as string),
      url: data.url ? `https://${data.url}` : undefined,
    };
  }

  async getPreviewUrl(deploymentId: string): Promise<string> {
    const status = await this.getDeploymentStatus(deploymentId);
    return status.url ?? "";
  }

  async captureScreenshot(url: string): Promise<ScreenshotResult> {
    // Use a screenshot service (e.g. a self-hosted Playwright endpoint,
    // or a service like screenshotone.com configured via screenshotApiUrl).
    if (!this.screenshotApiUrl) {
      throw new Error("No screenshotApiUrl configured in Vercel connector settings");
    }

    const endpoint = `${this.screenshotApiUrl}?url=${encodeURIComponent(url)}&format=png&width=1280&height=800`;
    const res = await fetch(endpoint, { method: "GET" });

    if (!res.ok) throw new Error(`Screenshot service returned ${res.status}`);

    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUri = `data:image/png;base64,${base64}`;

    return {
      url: endpoint,  // the screenshot service URL acts as a permalink
      dataUri,
      capturedAt: new Date(),
    };
  }

  private async pollByBranch(branch: string, attempt = 0): Promise<DeploymentStatus> {
    if (attempt > 5) {
      return { id: `pending:${branch}`, state: "error", buildLog: "Deployment not found after polling" };
    }

    await new Promise(r => setTimeout(r, 5_000));
    // Re-search by branch
    const qs = new URLSearchParams();
    if (this.teamId) qs.set("teamId", this.teamId);

    const data = await this.vercelApi(`v6/deployments?${qs}`, "GET");
    const deployments = (data.deployments as Record<string, unknown>[]) ?? [];
    const match = deployments.find(
      d => (d.meta as Record<string, string>)?.githubCommitRef === branch,
    );

    if (match) {
      return {
        id: match.uid as string,
        state: mapVercelState(match.state as string),
        url: match.url ? `https://${match.url}` : undefined,
      };
    }

    return this.pollByBranch(branch, attempt + 1);
  }

  private async vercelApi(
    path: string,
    method: string,
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`https://api.vercel.com/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json() as Promise<Record<string, unknown>>;
  }
}

function mapVercelState(state: string): DeploymentStatus["state"] {
  switch (state?.toUpperCase()) {
    case "READY": return "ready";
    case "ERROR": case "FAILED": return "error";
    case "CANCELED": return "cancelled";
    default: return "building";
  }
}

export default function create(settings: Record<string, unknown>): VercelIntegration {
  if (!settings.token) throw new Error("Vercel connector requires token");
  return new VercelIntegration(settings as unknown as VercelSettings);
}
