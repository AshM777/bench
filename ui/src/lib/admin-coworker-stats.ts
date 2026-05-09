import type { Agent } from "@bench/shared";
import { getBenchManagerEmailFromMetadata } from "./manager-scope";

export type ManagerSpendRow = {
  managerEmail: string;
  coworkerCount: number;
  monthSpendCents: number;
};

export function computeAdminCoworkerOverview(agents: Agent[]): {
  totalCoworkers: number;
  managerCount: number;
  unassignedCoworkers: number;
  managerRows: ManagerSpendRow[];
} {
  const nonTerminated = agents.filter((a) => a.status !== "terminated");
  const byManager = new Map<string, { count: number; spend: number }>();
  let unassigned = 0;

  for (const a of nonTerminated) {
    const mgr = getBenchManagerEmailFromMetadata(a.metadata);
    const spend = Number(a.spentMonthlyCents ?? 0);
    if (!mgr) {
      unassigned += 1;
      continue;
    }
    const cur = byManager.get(mgr) ?? { count: 0, spend: 0 };
    cur.count += 1;
    cur.spend += spend;
    byManager.set(mgr, cur);
  }

  const managerRows = [...byManager.entries()]
    .map(([managerEmail, v]) => ({
      managerEmail,
      coworkerCount: v.count,
      monthSpendCents: v.spend,
    }))
    .sort((a, b) => b.monthSpendCents - a.monthSpendCents);

  return {
    totalCoworkers: nonTerminated.length,
    managerCount: byManager.size,
    unassignedCoworkers: unassigned,
    managerRows,
  };
}
