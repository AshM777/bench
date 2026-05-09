import type { ActivityEvent, Agent, Issue } from "@bench/shared";

/** Agent metadata key: normalized manager email that owns this hire for manager-dashboard scope. */
export const BENCH_MANAGER_EMAIL_METADATA_KEY = "benchManagerEmail";

export function normalizePersonaEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getBenchManagerEmailFromMetadata(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  const raw = metadata[BENCH_MANAGER_EMAIL_METADATA_KEY];
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return t.length ? normalizePersonaEmail(t) : null;
}

export function filterAgentsForManagerEmail(agents: Agent[], managerEmail: string): Agent[] {
  const norm = normalizePersonaEmail(managerEmail);
  return agents.filter((a) => getBenchManagerEmailFromMetadata(a.metadata) === norm);
}

export function issueTouchesScopedAgents(issue: Issue, scopedAgentIds: Set<string>): boolean {
  if (issue.assigneeAgentId && scopedAgentIds.has(issue.assigneeAgentId)) return true;
  if (issue.createdByAgentId && scopedAgentIds.has(issue.createdByAgentId)) return true;
  const cur = issue.executionState?.currentParticipant?.agentId;
  if (cur && scopedAgentIds.has(cur)) return true;
  const stages = issue.executionPolicy?.stages ?? [];
  for (const s of stages) {
    for (const p of s.participants ?? []) {
      if (p.agentId && scopedAgentIds.has(p.agentId)) return true;
    }
  }
  return false;
}

export function activityTouchesScopedAgents(event: ActivityEvent, scopedAgentIds: Set<string>): boolean {
  if (event.agentId && scopedAgentIds.has(event.agentId)) return true;
  if (event.entityType === "agent" && scopedAgentIds.has(event.entityId)) return true;
  if (event.actorType === "agent" && scopedAgentIds.has(event.actorId)) return true;
  const aid = event.details?.assigneeAgentId;
  if (typeof aid === "string" && scopedAgentIds.has(aid)) return true;
  return false;
}

export function scopedAgentDashboardCounts(agents: Agent[]): {
  active: number;
  running: number;
  paused: number;
  error: number;
} {
  let active = 0;
  let running = 0;
  let paused = 0;
  let error = 0;
  for (const a of agents) {
    if (a.status === "terminated") continue;
    if (a.status === "idle" || a.status === "active") active++;
    else if (a.status === "running") running++;
    else if (a.status === "paused") paused++;
    else if (a.status === "error") error++;
  }
  return { active, running, paused, error };
}

export function taskCountsFromIssues(issues: Issue[]): {
  open: number;
  inProgress: number;
  blocked: number;
  done: number;
} {
  const taskCounts = { open: 0, inProgress: 0, blocked: 0, done: 0 };
  for (const issue of issues) {
    const row = issue.status;
    if (row === "in_progress") taskCounts.inProgress += 1;
    if (row === "blocked") taskCounts.blocked += 1;
    if (row === "done") taskCounts.done += 1;
    if (row !== "done" && row !== "cancelled") taskCounts.open += 1;
  }
  return taskCounts;
}
