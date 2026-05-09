import type { Agent } from "@bench/shared";
import type { OrgNode } from "../api/agents";

/**
 * Org roots for a manager's coworker roster: agents whose `reportsTo` is null or points outside the scoped set
 * appear as direct reports under the manager shell in the UI; edges among scoped agents preserve hierarchy.
 */
export function buildManagerScopedOrgNodes(scopedAgents: Agent[]): OrgNode[] {
  if (scopedAgents.length === 0) return [];

  const scopedIds = new Set(scopedAgents.map((a) => a.id));

  function buildSubtree(agent: Agent): OrgNode {
    const children = scopedAgents
      .filter((c) => c.reportsTo === agent.id)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(buildSubtree);

    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      status: agent.status,
      reports: children,
    };
  }

  const roots = scopedAgents
    .filter((a) => a.reportsTo === null || !scopedIds.has(a.reportsTo))
    .sort((a, b) => a.name.localeCompare(b.name));

  return roots.map(buildSubtree);
}
