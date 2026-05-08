import fs from "node:fs";
import { benchConfigSchema, type BenchConfig } from "@bench/shared";
import { resolveBenchConfigPath } from "./paths.js";

export function readConfigFile(): BenchConfig | null {
  const configPath = resolveBenchConfigPath();

  if (!fs.existsSync(configPath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return benchConfigSchema.parse(raw);
  } catch {
    return null;
  }
}
