import { describe, expect, it } from "vitest";
import {
  listAcpxSkills,
  syncAcpxSkills,
} from "@bench/adapter-acpx-local/server";

describe("acpx local skill sync", () => {
  const benchKey = "bench/bench/bench";
  const createAgentKey = "bench/bench/bench-create-agent";

  it("reports ACPX Claude skills as supported runtime-mounted state", async () => {
    const snapshot = await listAcpxSkills({
      agentId: "agent-1",
      companyId: "company-1",
      adapterType: "acpx_local",
      config: {
        agent: "claude",
        benchSkillSync: {
          desiredSkills: [benchKey],
        },
      },
    });

    expect(snapshot.adapterType).toBe("acpx_local");
    expect(snapshot.supported).toBe(true);
    expect(snapshot.mode).toBe("ephemeral");
    expect(snapshot.desiredSkills).toContain(benchKey);
    expect(snapshot.desiredSkills).toContain(createAgentKey);
    expect(snapshot.entries.find((entry) => entry.key === benchKey)?.state).toBe("configured");
    expect(snapshot.entries.find((entry) => entry.key === benchKey)?.detail).toContain("ACPX Claude session");
    expect(snapshot.warnings).toEqual([]);
  });

  it("reports ACPX Codex skills with Codex home runtime detail", async () => {
    const snapshot = await syncAcpxSkills({
      agentId: "agent-2",
      companyId: "company-1",
      adapterType: "acpx_local",
      config: {
        agent: "codex",
        benchSkillSync: {
          desiredSkills: ["bench"],
        },
      },
    }, ["bench"]);

    expect(snapshot.supported).toBe(true);
    expect(snapshot.mode).toBe("ephemeral");
    expect(snapshot.desiredSkills).toContain(benchKey);
    expect(snapshot.desiredSkills).not.toContain("bench");
    expect(snapshot.entries.find((entry) => entry.key === benchKey)?.state).toBe("configured");
    expect(snapshot.entries.find((entry) => entry.key === benchKey)?.detail).toContain("CODEX_HOME/skills/");
    expect(snapshot.warnings).toEqual([]);
  });

  it("keeps ACPX custom skill selection tracked but unsupported", async () => {
    const snapshot = await listAcpxSkills({
      agentId: "agent-3",
      companyId: "company-1",
      adapterType: "acpx_local",
      config: {
        agent: "custom",
        benchSkillSync: {
          desiredSkills: [benchKey],
        },
      },
    });

    expect(snapshot.supported).toBe(false);
    expect(snapshot.mode).toBe("unsupported");
    expect(snapshot.desiredSkills).toContain(benchKey);
    expect(snapshot.entries.find((entry) => entry.key === benchKey)?.desired).toBe(true);
    expect(snapshot.entries.find((entry) => entry.key === benchKey)?.detail).toContain("stored in Bench only");
    expect(snapshot.warnings).toContain(
      "Custom ACP commands do not expose a Bench skill integration contract yet; selected skills are tracked only.",
    );
  });
});
