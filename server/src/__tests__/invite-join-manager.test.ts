import { describe, expect, it } from "vitest";
import { resolveJoinRequestAgentManagerId } from "../routes/access.js";

describe("resolveJoinRequestAgentManagerId", () => {
  it("returns null when no Admin coworker exists in the company agent list", () => {
    const managerId = resolveJoinRequestAgentManagerId([
      { id: "a1", role: "engineer", reportsTo: null },
      { id: "a2", role: "engineer", reportsTo: "a1" },
    ]);

    expect(managerId).toBeNull();
  });

  it("selects the root Admin when available", () => {
    const managerId = resolveJoinRequestAgentManagerId([
      { id: "admin-child", role: "admin", reportsTo: "manager-1" },
      { id: "manager-1", role: "engineer", reportsTo: null },
      { id: "admin-root", role: "admin", reportsTo: null },
    ]);

    expect(managerId).toBe("admin-root");
  });

  it("falls back to the first Admin when no root Admin is present", () => {
    const managerId = resolveJoinRequestAgentManagerId([
      { id: "admin-1", role: "admin", reportsTo: "mgr" },
      { id: "admin-2", role: "admin", reportsTo: "mgr" },
      { id: "mgr", role: "engineer", reportsTo: null },
    ]);

    expect(managerId).toBe("admin-1");
  });
});
