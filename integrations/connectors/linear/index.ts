/**
 * Linear connector.
 * Required env / config:
 *   LINEAR_API_KEY  - Linear personal API key or OAuth token
 *
 * Drop-in replacement for Jira - same TicketingIntegration interface.
 */

import type {
  TicketingIntegration,
  OperationResult,
  TicketInfo,
  TicketUpdate,
  CreateTicketParams,
} from "../../types.js";

interface LinearSettings {
  apiKey: string;
  teamId?: string;   // default team for new tickets
}

class LinearIntegration implements TicketingIntegration {
  id = "linear";
  private apiKey: string;
  private teamId?: string;

  constructor(settings: LinearSettings) {
    this.apiKey = settings.apiKey;
    this.teamId = settings.teamId;
  }

  async getTicket(ticketId: string): Promise<TicketInfo> {
    const data = await this.query(`
      query { issue(id: "${ticketId}") {
        id identifier title description
        state { name }
        assignee { name }
        creator { name }
        priority
        url
      }}
    `);
    const issue = data.data.issue as Record<string, unknown>;
    return {
      id: issue.identifier as string,
      title: issue.title as string,
      description: issue.description as string ?? "",
      status: (issue.state as Record<string, string>).name,
      assignee: (issue.assignee as Record<string, string> | null)?.name,
      reporter: (issue.creator as Record<string, string>).name,
      priority: String(issue.priority ?? ""),
      url: issue.url as string,
    };
  }

  async updateTicket(ticketId: string, update: TicketUpdate): Promise<OperationResult> {
    const input: Record<string, unknown> = {};
    if (update.title) input.title = update.title;
    if (update.description) input.description = update.description;
    await this.query(`mutation { issueUpdate(id: "${ticketId}", input: ${toGqlInput(input)}) { success } }`);
    return {
      success: true,
      integrationId: this.id,
      operationId: "update_ticket",
      summary: `Ticket ${ticketId} updated`,
    };
  }

  async closeTicket(ticketId: string, _resolution?: string): Promise<OperationResult> {
    // Get the "Done" state ID for the team
    const statesData = await this.query(`query { workflowStates(filter: { type: { eq: "completed" } }) { nodes { id name } } }`);
    const states = (statesData.data.workflowStates.nodes as Record<string, string>[]);
    const done = states.find(s => s.name.toLowerCase() === "done") ?? states[0];
    if (!done) {
      return { success: false, integrationId: this.id, operationId: "close_ticket", summary: "No completed state found", error: "No completed state" };
    }
    await this.query(`mutation { issueUpdate(id: "${ticketId}", input: { stateId: "${done.id}" }) { success } }`);
    return { success: true, integrationId: this.id, operationId: "close_ticket", summary: `Ticket ${ticketId} closed` };
  }

  async createTicket(params: CreateTicketParams): Promise<OperationResult> {
    const teamId = this.teamId ?? params.projectId;
    const input: Record<string, unknown> = {
      teamId,
      title: params.title,
      description: params.description,
    };
    if (params.priority) input.priority = parseInt(params.priority, 10) || 0;

    const data = await this.query(`mutation { issueCreate(input: ${toGqlInput(input)}) { success issue { id identifier url } } }`);
    const result = data.data.issueCreate as Record<string, unknown>;
    const issue = result.issue as Record<string, string> | null;
    return {
      success: result.success as boolean,
      integrationId: this.id,
      operationId: "create_ticket",
      externalRef: issue?.url,
      summary: issue ? `Created ${issue.identifier}` : "Creation failed",
      data: { id: issue?.id, identifier: issue?.identifier },
    };
  }

  async addComment(ticketId: string, comment: string): Promise<OperationResult> {
    await this.query(`mutation { commentCreate(input: { issueId: "${ticketId}", body: ${JSON.stringify(comment)} }) { success } }`);
    return { success: true, integrationId: this.id, operationId: "add_comment", summary: `Comment added to ${ticketId}` };
  }

  async assignTicket(ticketId: string, assignee: string): Promise<OperationResult> {
    await this.query(`mutation { issueUpdate(id: "${ticketId}", input: { assigneeId: "${assignee}" }) { success } }`);
    return { success: true, integrationId: this.id, operationId: "assign_ticket", summary: `Assigned ${ticketId} to ${assignee}` };
  }

  private async query(gql: string): Promise<Record<string, unknown>> {
    const res = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        Authorization: this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: gql }),
    });
    return res.json() as Promise<Record<string, unknown>>;
  }
}

function toGqlInput(obj: Record<string, unknown>): string {
  const pairs = Object.entries(obj)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `{ ${pairs.join(", ")} }`;
}

export default function create(settings: Record<string, unknown>): LinearIntegration {
  if (!settings.apiKey) throw new Error("Linear connector requires apiKey");
  return new LinearIntegration(settings as unknown as LinearSettings);
}
