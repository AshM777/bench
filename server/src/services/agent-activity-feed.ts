import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@bench/db";
import { agents, heartbeatRuns } from "@bench/db";
import type { AgentActivityFeedEntry } from "@bench/shared";
import { activityService, normalizeActivityLimit } from "./activity.js";

function truncateSummary(text: string, max = 280): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function issueHintFromSnapshot(snapshot: Record<string, unknown> | null | undefined): string | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const raw = snapshot.issueId ?? snapshot["issue_id"];
  if (typeof raw === "string" && raw.trim().length > 0) {
    return `issue ${raw.trim()}`;
  }
  return null;
}

/** Merges `activity_log` and recent `heartbeat_runs` for one agent (same row as PaperClip agent). */
export function agentActivityFeedService(db: Db) {
  const activitySvc = activityService(db);

  async function list(companyId: string, agentId: string, limit?: number): Promise<AgentActivityFeedEntry[]> {
    const cap = normalizeActivityLimit(limit);

    const [logRows, runRows] = await Promise.all([
      activitySvc.list({
        companyId,
        agentId,
        limit: cap,
      }),
      db
        .select({
          id: heartbeatRuns.id,
          status: heartbeatRuns.status,
          createdAt: heartbeatRuns.createdAt,
          startedAt: heartbeatRuns.startedAt,
          invocationSource: heartbeatRuns.invocationSource,
          adapterType: agents.adapterType,
          contextSnapshot: heartbeatRuns.contextSnapshot,
        })
        .from(heartbeatRuns)
        .innerJoin(agents, eq(heartbeatRuns.agentId, agents.id))
        .where(and(eq(heartbeatRuns.companyId, companyId), eq(heartbeatRuns.agentId, agentId)))
        .orderBy(desc(heartbeatRuns.createdAt))
        .limit(cap),
    ]);

    const fromLog: AgentActivityFeedEntry[] = logRows.map((row) => ({
      id: `activity:${row.id}`,
      source: "bench_activity",
      occurredAt: row.createdAt.toISOString(),
      actionType: row.action,
      summary: truncateSummary([row.action, row.entityType, row.entityId].filter(Boolean).join(" · ")),
      runId: row.runId ?? null,
      entityType: row.entityType,
      entityId: row.entityId,
    }));

    const fromRuns: AgentActivityFeedEntry[] = runRows.map((row) => {
      const issueHint = issueHintFromSnapshot(row.contextSnapshot ?? undefined);
      const adapter = row.adapterType ?? "adapter";
      const base = `${adapter} run (${row.status}) · ${row.invocationSource}`;
      const summary = truncateSummary(issueHint ? `${base} · ${issueHint}` : base);
      const at = row.startedAt ?? row.createdAt;
      return {
        id: `run:${row.id}`,
        source: "bench_run",
        occurredAt: at.toISOString(),
        actionType: `run.${row.status}`,
        summary,
        runId: row.id,
        entityType: null,
        entityId: null,
      };
    });

    const merged = [...fromLog, ...fromRuns].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
    return merged.slice(0, cap);
  }

  return { list };
}
