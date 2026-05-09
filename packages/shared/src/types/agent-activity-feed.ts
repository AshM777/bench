/** Unified activity log + runs timeline for an agent (Bench product language: “coworker”). */
export type AgentActivityFeedSource = "bench_activity" | "bench_run";

export interface AgentActivityFeedEntry {
  id: string;
  source: AgentActivityFeedSource;
  /** ISO 8601 timestamp */
  occurredAt: string;
  actionType: string;
  summary: string;
  runId: string | null;
  entityType: string | null;
  entityId: string | null;
}

export interface AgentActivityFeedResponse {
  entries: AgentActivityFeedEntry[];
}
