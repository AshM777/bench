import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  listCursorSkills,
  syncCursorSkills,
} from "@bench/adapter-cursor-local/server";

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function createSkillDir(root: string, name: string) {
  const skillDir = path.join(root, name);
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(path.join(skillDir, "SKILL.md"), `---\nname: ${name}\n---\n`, "utf8");
  return skillDir;
}

describe("cursor local skill sync", () => {
  const benchKey = "bench/bench/bench";
  const cleanupDirs = new Set<string>();

  afterEach(async () => {
    await Promise.all(Array.from(cleanupDirs).map((dir) => fs.rm(dir, { recursive: true, force: true })));
    cleanupDirs.clear();
  });

  it("reports configured Bench skills and installs them into the Cursor skills home", async () => {
    const home = await makeTempDir("bench-cursor-skill-sync-");
    cleanupDirs.add(home);

    const ctx = {
      agentId: "agent-1",
      companyId: "company-1",
      adapterType: "cursor",
      config: {
        env: {
          HOME: home,
        },
        benchSkillSync: {
          desiredSkills: [benchKey],
        },
      },
    } as const;

    const before = await listCursorSkills(ctx);
    expect(before.mode).toBe("persistent");
    expect(before.desiredSkills).toContain(benchKey);
    expect(before.entries.find((entry) => entry.key === benchKey)?.required).toBe(true);
    expect(before.entries.find((entry) => entry.key === benchKey)?.state).toBe("missing");

    const after = await syncCursorSkills(ctx, [benchKey]);
    expect(after.entries.find((entry) => entry.key === benchKey)?.state).toBe("installed");
    expect((await fs.lstat(path.join(home, ".cursor", "skills", "bench"))).isSymbolicLink()).toBe(true);
  });

  it("recognizes company-library runtime skills supplied outside the bundled Bench directory", async () => {
    const home = await makeTempDir("bench-cursor-runtime-skills-home-");
    const runtimeSkills = await makeTempDir("bench-cursor-runtime-skills-src-");
    cleanupDirs.add(home);
    cleanupDirs.add(runtimeSkills);

    const benchDir = await createSkillDir(runtimeSkills, "bench");
    const asciiHeartDir = await createSkillDir(runtimeSkills, "ascii-heart");

    const ctx = {
      agentId: "agent-3",
      companyId: "company-1",
      adapterType: "cursor",
      config: {
        env: {
          HOME: home,
        },
        benchRuntimeSkills: [
          {
            key: "bench",
            runtimeName: "bench",
            source: benchDir,
            required: true,
            requiredReason: "Bundled Bench skills are always available for local adapters.",
          },
          {
            key: "ascii-heart",
            runtimeName: "ascii-heart",
            source: asciiHeartDir,
          },
        ],
        benchSkillSync: {
          desiredSkills: ["ascii-heart"],
        },
      },
    } as const;

    const before = await listCursorSkills(ctx);
    expect(before.warnings).toEqual([]);
    expect(before.desiredSkills).toEqual(["bench", "ascii-heart"]);
    expect(before.entries.find((entry) => entry.key === "ascii-heart")?.state).toBe("missing");

    const after = await syncCursorSkills(ctx, ["ascii-heart"]);
    expect(after.warnings).toEqual([]);
    expect(after.entries.find((entry) => entry.key === "ascii-heart")?.state).toBe("installed");
    expect((await fs.lstat(path.join(home, ".cursor", "skills", "ascii-heart"))).isSymbolicLink()).toBe(true);
  });

  it("keeps required bundled Bench skills installed even when the desired set is emptied", async () => {
    const home = await makeTempDir("bench-cursor-skill-prune-");
    cleanupDirs.add(home);

    const configuredCtx = {
      agentId: "agent-2",
      companyId: "company-1",
      adapterType: "cursor",
      config: {
        env: {
          HOME: home,
        },
        benchSkillSync: {
          desiredSkills: [benchKey],
        },
      },
    } as const;

    await syncCursorSkills(configuredCtx, [benchKey]);

    const clearedCtx = {
      ...configuredCtx,
      config: {
        env: {
          HOME: home,
        },
        benchSkillSync: {
          desiredSkills: [],
        },
      },
    } as const;

    const after = await syncCursorSkills(clearedCtx, []);
    expect(after.desiredSkills).toContain(benchKey);
    expect(after.entries.find((entry) => entry.key === benchKey)?.state).toBe("installed");
    expect((await fs.lstat(path.join(home, ".cursor", "skills", "bench"))).isSymbolicLink()).toBe(true);
  });
});
