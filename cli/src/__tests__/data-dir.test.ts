import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyDataDirOverride } from "../config/data-dir.js";

const ORIGINAL_ENV = { ...process.env };

describe("applyDataDirOverride", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.BENCH_HOME;
    delete process.env.BENCH_CONFIG;
    delete process.env.BENCH_CONTEXT;
    delete process.env.BENCH_INSTANCE_ID;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("sets BENCH_HOME and isolated default config/context paths", () => {
    const home = applyDataDirOverride({
      dataDir: "~/bench-data",
      config: undefined,
      context: undefined,
    }, { hasConfigOption: true, hasContextOption: true });

    const expectedHome = path.resolve(os.homedir(), "bench-data");
    expect(home).toBe(expectedHome);
    expect(process.env.BENCH_HOME).toBe(expectedHome);
    expect(process.env.BENCH_CONFIG).toBe(
      path.resolve(expectedHome, "instances", "default", "config.json"),
    );
    expect(process.env.BENCH_CONTEXT).toBe(path.resolve(expectedHome, "context.json"));
    expect(process.env.BENCH_INSTANCE_ID).toBe("default");
  });

  it("uses the provided instance id when deriving default config path", () => {
    const home = applyDataDirOverride({
      dataDir: "/tmp/bench-alt",
      instance: "dev_1",
      config: undefined,
      context: undefined,
    }, { hasConfigOption: true, hasContextOption: true });

    expect(home).toBe(path.resolve("/tmp/bench-alt"));
    expect(process.env.BENCH_INSTANCE_ID).toBe("dev_1");
    expect(process.env.BENCH_CONFIG).toBe(
      path.resolve("/tmp/bench-alt", "instances", "dev_1", "config.json"),
    );
  });

  it("does not override explicit config/context settings", () => {
    process.env.BENCH_CONFIG = "/env/config.json";
    process.env.BENCH_CONTEXT = "/env/context.json";

    applyDataDirOverride({
      dataDir: "/tmp/bench-alt",
      config: "/flag/config.json",
      context: "/flag/context.json",
    }, { hasConfigOption: true, hasContextOption: true });

    expect(process.env.BENCH_CONFIG).toBe("/env/config.json");
    expect(process.env.BENCH_CONTEXT).toBe("/env/context.json");
  });

  it("only applies defaults for options supported by the command", () => {
    applyDataDirOverride(
      {
        dataDir: "/tmp/bench-alt",
      },
      { hasConfigOption: false, hasContextOption: false },
    );

    expect(process.env.BENCH_HOME).toBe(path.resolve("/tmp/bench-alt"));
    expect(process.env.BENCH_CONFIG).toBeUndefined();
    expect(process.env.BENCH_CONTEXT).toBeUndefined();
  });
});
