/**
 * Jira connector.
 * Required env / config:
 *   JIRA_BASE_URL   - e.g. https://yourorg.atlassian.net
 *   JIRA_EMAIL      - the email Joel's API key is tied to
 *   JIRA_API_TOKEN  - Atlassian API token (not password)
 */

import type {
  TicketingIntegration,
  OperationResult,
  TicketInfo,
  TicketUpdate,
  CreateTicketParams,
} from "../../types.js";

interface JiraSettings {
  baseUrl: string;
  email: string;
  apiToken: string;
  doneTransitionName?: string; // default: "Done"
}

class JiraIntegration implements TicketingIntegration {
  id = "jira";
  private baseUrl: string;
  private authHeader: string;
  private doneTransitionName: string;

  constructor(settings: JiraSettings) {
    this.baseUrl = settings.baseUrl.replace(/\/$/, "");
    this.authHeader = `Basic ${Buffer.from(`${settings.email}:${settings.apiToken}`).toString("base64")}`;
    this.doneTransitionName = settings.doneTransitionName ?? "Done";
  }

  async getTicket(ticketId: string): Promise<TicketInfo> {
    const data = await this.jiraApi(`issue/${ticketId}`, "GET");
    const fields = data.fields as Record<string, unknown>;
    return {
      id: ticketId,
      title: fields.summary as string,
      description: (fields.description as Record<string, unknown>)?.toString() ?? "",
      status: (fields.status as Record<string, string>).name,
      assignee: ((fields.assignee as Record<string, string>) ?? {}).displayName,
      reporter: ((fields.reporter as Record<string, string>) ?? {}).displayName,
      priority: ((fields.priority as Record<string, string>) ?? {}).name,
      url: `${this.baseUrl}/browse/${ticketId}`,
    };
  }

  async updateTicket(ticketId: string, update: TicketUpdate): Promise<OperationResult> {
    const fields: Record<string, unknown> = {};
    if (update.title) fields.summary = update.title;
    if (update.description) fields.description = { type: "doc", version: 1, content: [{ type: "paragraph", content: [{ type: "text", text: update.description }] }] };
    if (update.priority) fields.priority = { name: update.priority };
    if (update.labels) fields.labels = update.labels;

    await this.jiraApi(`issue/${ticketId}`, "PUT", { fields });

    if (update.status) {
      await this.transitionTo(ticketId, update.status);
    }

    return {
      success: true,
      integrationId: this.id,
      operationId: "update_ticket",
      externalRef: `${this.baseUrl}/browse/${ticketId}`,
      summary: `Ticket ${ticketId} updated`,
    };
  }

  async closeTicket(ticketId: string, resolution?: string): Promise<OperationResult> {
    const transitioned = await this.transitionTo(ticketId, this.doneTransitionName);
    if (!transitioned) {
      return {
        success: false,
        integrationId: this.id,
        operationId: "close_ticket",
        summary: `Could not find "${this.doneTransitionName}" transition on ${ticketId}`,
        error: `No matching transition. Check doneTransitionName config.`,
      };
    }
    return {
      success: true,
      integrationId: this.id,
      operationId: "close_ticket",
      externalRef: `${this.baseUrl}/browse/${ticketId}`,
      summary: `Ticket ${ticketId} closed`,
    };
  }

  async createTicket(params: CreateTicketParams): Promise<OperationResult> {
    const body: Record<string, unknown> = {
      fields: {
        project: { key: params.projectId },
        summary: params.title,
        description: {
          type: "doc",
          version: 1,
          content: [{ type: "paragraph", content: [{ type: "text", text: params.description }] }],
        },
        issuetype: { name: params.type ?? "Task" },
        priority: params.priority ? { name: params.priority } : undefined,
        assignee: params.assignee ? { name: params.assignee } : undefined,
        labels: params.labels ?? [],
        parent: params.parentTicketId ? { key: params.parentTicketId } : undefined,
      },
    };

    const data = await this.jiraApi("issue", "POST", body);
    return {
      success: !!data.key,
      integrationId: this.id,
      operationId: "create_ticket",
      externalRef: data.key ? `${this.baseUrl}/browse/${data.key}` : undefined,
      summary: data.key ? `Created ${data.key}` : `Creation failed: ${JSON.stringify(data)}`,
      data: { key: data.key },
      error: data.key ? undefined : String(data.errorMessages ?? data.errors ?? ""),
    };
  }

  async addComment(ticketId: string, comment: string): Promise<OperationResult> {
    const data = await this.jiraApi(`issue/${ticketId}/comment`, "POST", {
      body: {
        type: "doc",
        version: 1,
        content: [{ type: "paragraph", content: [{ type: "text", text: comment }] }],
      },
    });
    return {
      success: !!data.id,
      integrationId: this.id,
      operationId: "add_comment",
      summary: data.id ? `Comment added to ${ticketId}` : `Comment failed`,
      error: data.id ? undefined : "Comment creation failed",
    };
  }

  async assignTicket(ticketId: string, assignee: string): Promise<OperationResult> {
    await this.jiraApi(`issue/${ticketId}/assignee`, "PUT", { name: assignee });
    return {
      success: true,
      integrationId: this.id,
      operationId: "assign_ticket",
      summary: `Ticket ${ticketId} assigned to ${assignee}`,
    };
  }

  async linkTicket(ticketId: string, linkedTicketId: string, linkType: string): Promise<OperationResult> {
    await this.jiraApi("issueLink", "POST", {
      type: { name: linkType },
      inwardIssue: { key: ticketId },
      outwardIssue: { key: linkedTicketId },
    });
    return {
      success: true,
      integrationId: this.id,
      operationId: "link_ticket",
      summary: `Linked ${ticketId} to ${linkedTicketId} (${linkType})`,
    };
  }

  private async transitionTo(ticketId: string, targetStatus: string): Promise<boolean> {
    const data = await this.jiraApi(`issue/${ticketId}/transitions`, "GET");
    const transitions = (data.transitions as Record<string, unknown>[]) ?? [];
    const match = transitions.find(
      t => (t.name as string).toLowerCase() === targetStatus.toLowerCase(),
    );
    if (!match) return false;
    await this.jiraApi(`issue/${ticketId}/transitions`, "POST", { transition: { id: match.id } });
    return true;
  }

  private async jiraApi(
    path: string,
    method: string,
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}/rest/api/3/${path}`, {
      method,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return {};
    return res.json() as Promise<Record<string, unknown>>;
  }
}

export default function create(settings: Record<string, unknown>): JiraIntegration {
  if (!settings.baseUrl || !settings.email || !settings.apiToken) {
    throw new Error("Jira connector requires baseUrl, email, and apiToken");
  }
  return new JiraIntegration(settings as unknown as JiraSettings);
}
