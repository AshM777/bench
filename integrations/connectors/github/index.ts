/**
 * GitHub connector.
 * Required env / config:
 *   GITHUB_TOKEN - PAT or GitHub App installation token
 *                  Scopes: repo, pull_requests, statuses
 */

import type {
  VCSIntegration,
  OperationResult,
  CreatePRParams,
  RepoInfo,
  BranchInfo,
  CIStatus,
  CICheckRun,
} from "../../types.js";

interface GithubSettings {
  token: string;
  defaultOrg?: string;
}

class GithubIntegration implements VCSIntegration {
  id = "github";
  private token: string;
  private defaultOrg?: string;

  constructor(settings: GithubSettings) {
    this.token = settings.token;
    this.defaultOrg = settings.defaultOrg;
  }

  async createPR(params: CreatePRParams): Promise<OperationResult> {
    const [owner, repo] = this.parseRepoId(params.repoId);
    const body: Record<string, unknown> = {
      title: params.title,
      body: params.body,
      head: params.headBranch,
      base: params.baseBranch,
      draft: params.draftUntilApproved ?? false,
    };

    const response = await this.githubApi(`repos/${owner}/${repo}/pulls`, "POST", body);

    if (response.number) {
      if (params.reviewers?.length) {
        await this.githubApi(`repos/${owner}/${repo}/pulls/${response.number}/requested_reviewers`, "POST", {
          reviewers: params.reviewers,
        });
      }
      if (params.labels?.length) {
        await this.githubApi(`repos/${owner}/${repo}/issues/${response.number}/labels`, "POST", {
          labels: params.labels,
        });
      }
    }

    return {
      success: !!response.number,
      integrationId: this.id,
      operationId: "create_pr",
      externalRef: response.html_url as string,
      summary: response.number
        ? `PR #${response.number} created: ${response.html_url}`
        : `PR creation failed: ${JSON.stringify(response)}`,
      data: { number: response.number },
      error: response.number ? undefined : String(response.message ?? "Unknown error"),
    };
  }

  async getRepo(repoId: string): Promise<RepoInfo> {
    const [owner, repo] = this.parseRepoId(repoId);
    const data = await this.githubApi(`repos/${owner}/${repo}`, "GET");
    return {
      id: repoId,
      name: data.name as string,
      defaultBranch: data.default_branch as string,
      url: data.html_url as string,
    };
  }

  async getBranch(repoId: string, branch: string): Promise<BranchInfo> {
    const [owner, repo] = this.parseRepoId(repoId);
    const data = await this.githubApi(`repos/${owner}/${repo}/branches/${branch}`, "GET");
    return {
      name: data.name as string,
      sha: (data.commit as Record<string, unknown>).sha as string,
      url: `https://github.com/${owner}/${repo}/tree/${branch}`,
    };
  }

  async checkCIStatus(repoId: string, sha: string): Promise<CIStatus> {
    const [owner, repo] = this.parseRepoId(repoId);
    const data = await this.githubApi(`repos/${owner}/${repo}/commits/${sha}/check-runs`, "GET");
    const runs = (data.check_runs as Record<string, unknown>[]) ?? [];

    const checkRuns: CICheckRun[] = runs.map(r => ({
      name: r.name as string,
      status: r.status as CICheckRun["status"],
      conclusion: r.conclusion as CICheckRun["conclusion"],
      url: r.html_url as string,
    }));

    const anyFailed = checkRuns.some(r => r.conclusion === "failure");
    const allDone = checkRuns.every(r => r.status === "completed");
    const anyRunning = checkRuns.some(r => r.status === "in_progress");

    const state: CIStatus["state"] = anyFailed
      ? "failure"
      : allDone ? "success"
      : anyRunning ? "running"
      : "pending";

    return {
      state,
      checkRuns,
      url: `https://github.com/${owner}/${repo}/commit/${sha}/checks`,
    };
  }

  async mergePR(repoId: string, prId: string): Promise<OperationResult> {
    const [owner, repo] = this.parseRepoId(repoId);
    const response = await this.githubApi(`repos/${owner}/${repo}/pulls/${prId}/merge`, "PUT", {
      merge_method: "squash",
    });
    return {
      success: response.merged === true,
      integrationId: this.id,
      operationId: "merge_pr",
      summary: response.merged ? "PR merged" : `Merge failed: ${response.message}`,
      error: response.merged ? undefined : String(response.message ?? ""),
    };
  }

  private parseRepoId(repoId: string): [string, string] {
    if (repoId.includes("/")) return repoId.split("/") as [string, string];
    if (this.defaultOrg) return [this.defaultOrg, repoId];
    throw new Error(`Cannot resolve repo "${repoId}" - set defaultOrg in github config or use "owner/repo" format`);
  }

  private async githubApi(
    path: string,
    method: string,
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`https://api.github.com/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json() as Promise<Record<string, unknown>>;
  }
}

export default function create(settings: Record<string, unknown>): GithubIntegration {
  if (!settings.token) throw new Error("GitHub connector requires token");
  return new GithubIntegration(settings as unknown as GithubSettings);
}
