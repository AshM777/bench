import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureCodexSkillsInjected } from "@bench/adapter-codex-local/server";

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function createBenchRepoSkill(root: string, skillName: string) {
  await fs.mkdir(path.join(root, "server"), { recursive: true });
  await fs.mkdir(path.join(root, "packages", "adapter-utils"), { recursive: true });
  await fs.mkdir(path.join(root, "skills", skillName), { recursive: true });
  await fs.writeFile(path.join(root, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n", "utf8");
  await fs.writeFile(path.join(root, "package.json"), '{"name":"bench"}\n', "utf8");
  await fs.writeFile(
    path.join(root, "skills", skillName, "SKILL.md"),
    `---\nname: ${skillName}\n---\n`,
    "utf8",
  );
}

async function createCustomSkill(root: string, skillName: string) {
  await fs.mkdir(path.join(root, "custom", skillName), { recursive: true });
  await fs.writeFile(
    path.join(root, "custom", skillName, "SKILL.md"),
    `---\nname: ${skillName}\n---\n`,
    "utf8",
  );
}

describe("codex local adapter skill injection", () => {
  const benchKey = "bench/bench/bench";
  const createAgentKey = "bench/bench/bench-create-agent";
  const cleanupDirs = new Set<string>();

  afterEach(async () => {
    await Promise.all(Array.from(cleanupDirs).map((dir) => fs.rm(dir, { recursive: true, force: true })));
    cleanupDirs.clear();
  });

  it("repairs a Codex Bench skill symlink that still points at another live checkout", async () => {
    const currentRepo = await makeTempDir("bench-codex-current-");
    const oldRepo = await makeTempDir("bench-codex-old-");
    const skillsHome = await makeTempDir("bench-codex-home-");
    cleanupDirs.add(currentRepo);
    cleanupDirs.add(oldRepo);
    cleanupDirs.add(skillsHome);

    await createBenchRepoSkill(currentRepo, "bench");
    await createBenchRepoSkill(currentRepo, "bench-create-agent");
    await createBenchRepoSkill(oldRepo, "bench");
    await fs.symlink(path.join(oldRepo, "skills", "bench"), path.join(skillsHome, "bench"));

    const logs: Array<{ stream: "stdout" | "stderr"; chunk: string }> = [];
    await ensureCodexSkillsInjected(
      async (stream, chunk) => {
        logs.push({ stream, chunk });
      },
      {
        skillsHome,
        skillsEntries: [
          {
            key: benchKey,
            runtimeName: "bench",
            source: path.join(currentRepo, "skills", "bench"),
          },
          {
            key: createAgentKey,
            runtimeName: "bench-create-agent",
            source: path.join(currentRepo, "skills", "bench-create-agent"),
          },
        ],
      },
    );

    expect(await fs.realpath(path.join(skillsHome, "bench"))).toBe(
      await fs.realpath(path.join(currentRepo, "skills", "bench")),
    );
    expect(await fs.realpath(path.join(skillsHome, "bench-create-agent"))).toBe(
      await fs.realpath(path.join(currentRepo, "skills", "bench-create-agent")),
    );
    expect(logs).toContainEqual(
      expect.objectContaining({
        stream: "stdout",
        chunk: expect.stringContaining('Repaired Codex skill "bench"'),
      }),
    );
    expect(logs).toContainEqual(
      expect.objectContaining({
        stream: "stdout",
        chunk: expect.stringContaining('Injected Codex skill "bench-create-agent"'),
      }),
    );
  });

  it("preserves a custom Codex skill symlink outside Bench repo checkouts", async () => {
    const currentRepo = await makeTempDir("bench-codex-current-");
    const customRoot = await makeTempDir("bench-codex-custom-");
    const skillsHome = await makeTempDir("bench-codex-home-");
    cleanupDirs.add(currentRepo);
    cleanupDirs.add(customRoot);
    cleanupDirs.add(skillsHome);

    await createBenchRepoSkill(currentRepo, "bench");
    await createCustomSkill(customRoot, "bench");
    await fs.symlink(path.join(customRoot, "custom", "bench"), path.join(skillsHome, "bench"));

    await ensureCodexSkillsInjected(async () => {}, {
      skillsHome,
      skillsEntries: [{
        key: benchKey,
        runtimeName: "bench",
        source: path.join(currentRepo, "skills", "bench"),
      }],
    });

    expect(await fs.realpath(path.join(skillsHome, "bench"))).toBe(
      await fs.realpath(path.join(customRoot, "custom", "bench")),
    );
  });

  it("prunes broken symlinks for unavailable Bench repo skills before Codex starts", async () => {
    const currentRepo = await makeTempDir("bench-codex-current-");
    const oldRepo = await makeTempDir("bench-codex-old-");
    const skillsHome = await makeTempDir("bench-codex-home-");
    cleanupDirs.add(currentRepo);
    cleanupDirs.add(oldRepo);
    cleanupDirs.add(skillsHome);

    await createBenchRepoSkill(currentRepo, "bench");
    await createBenchRepoSkill(oldRepo, "agent-browser");
    const staleTarget = path.join(oldRepo, "skills", "agent-browser");
    await fs.symlink(staleTarget, path.join(skillsHome, "agent-browser"));
    await fs.rm(staleTarget, { recursive: true, force: true });

    const logs: Array<{ stream: "stdout" | "stderr"; chunk: string }> = [];
    await ensureCodexSkillsInjected(
      async (stream, chunk) => {
        logs.push({ stream, chunk });
      },
      {
        skillsHome,
        skillsEntries: [{
          key: benchKey,
          runtimeName: "bench",
          source: path.join(currentRepo, "skills", "bench"),
        }],
      },
    );

    await expect(fs.lstat(path.join(skillsHome, "agent-browser"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    expect(logs).toContainEqual(
      expect.objectContaining({
        stream: "stdout",
        chunk: expect.stringContaining('Removed stale Codex skill "agent-browser"'),
      }),
    );
  });

  it("preserves other live Bench skill symlinks in the shared workspace skill directory", async () => {
    const currentRepo = await makeTempDir("bench-codex-current-");
    const skillsHome = await makeTempDir("bench-codex-home-");
    cleanupDirs.add(currentRepo);
    cleanupDirs.add(skillsHome);

    await createBenchRepoSkill(currentRepo, "bench");
    await createBenchRepoSkill(currentRepo, "agent-browser");
    await fs.symlink(
      path.join(currentRepo, "skills", "agent-browser"),
      path.join(skillsHome, "agent-browser"),
    );

    await ensureCodexSkillsInjected(async () => {}, {
      skillsHome,
      skillsEntries: [{
        key: benchKey,
        runtimeName: "bench",
        source: path.join(currentRepo, "skills", "bench"),
      }],
    });

    expect((await fs.lstat(path.join(skillsHome, "bench"))).isSymbolicLink()).toBe(true);
    expect((await fs.lstat(path.join(skillsHome, "agent-browser"))).isSymbolicLink()).toBe(true);
    expect(await fs.realpath(path.join(skillsHome, "agent-browser"))).toBe(
      await fs.realpath(path.join(currentRepo, "skills", "agent-browser")),
    );
  });
});
