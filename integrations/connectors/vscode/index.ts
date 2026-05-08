/**
 * VS Code connector (via continue.dev or VS Code CLI).
 * Drop-in alternative to cursor when the org uses VS Code instead.
 *
 * Required env / config:
 *   VSCODE_WORKSPACE_PATH  - absolute path to the repo
 *   VSCODE_BIN             - path to `code` CLI, defaults to "code"
 */

import { execFile } from "child_process";
import { promisify } from "util";
import type {
  IDEIntegration,
  OperationResult,
  CodeChangeParams,
  CommandResult,
  TestResult,
} from "../../types.js";

const execFileAsync = promisify(execFile);

interface VSCodeSettings {
  workspacePath: string;
  vscodeBin?: string;
}

class VSCodeIntegration implements IDEIntegration {
  id = "vscode";
  private workspacePath: string;
  private bin: string;

  constructor(settings: VSCodeSettings) {
    this.workspacePath = settings.workspacePath;
    this.bin = settings.vscodeBin ?? "code";
  }

  async openFile(filePath: string): Promise<OperationResult> {
    const result = await this.runCommand(`${this.bin} ${filePath}`);
    return {
      success: result.exitCode === 0,
      integrationId: this.id,
      operationId: "open_file",
      summary: result.exitCode === 0 ? `Opened ${filePath}` : `Failed: ${result.stderr}`,
    };
  }

  async applyChange(params: CodeChangeParams): Promise<OperationResult> {
    // VS Code headless: use the CLI extension API or a continue.dev script.
    // For now, this runs the change via a shell script that uses the VS Code
    // extension host in headless mode.
    const repoPath = params.repoPath === "auto" || params.repoPath === "."
      ? this.workspacePath
      : params.repoPath;

    // Placeholder: in practice this would invoke a custom VS Code extension
    // or use continue.dev's headless mode to apply the change.
    const result = await this.runCommand(
      `${this.bin} --headless --extensionDevelopmentPath=. --run-extension apply-change "${params.instruction}"`,
      repoPath,
    );

    return {
      success: result.exitCode === 0,
      integrationId: this.id,
      operationId: "apply_change",
      summary: result.exitCode === 0 ? "Change applied" : `Failed: ${result.stderr}`,
      error: result.exitCode !== 0 ? result.stderr : undefined,
    };
  }

  async runCommand(command: string, cwd?: string): Promise<CommandResult> {
    const start = Date.now();
    const workingDir = cwd ?? this.workspacePath;
    try {
      const [bin, ...args] = command.split(/\s+/);
      const { stdout, stderr } = await execFileAsync(bin, args, { cwd: workingDir, timeout: 120_000 });
      return { stdout, stderr, exitCode: 0, durationMs: Date.now() - start };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; code?: number };
      return { stdout: e.stdout ?? "", stderr: e.stderr ?? String(err), exitCode: e.code ?? 1, durationMs: Date.now() - start };
    }
  }

  async runTests(pattern?: string): Promise<TestResult> {
    const command = pattern
      ? `npx vitest run ${pattern} --reporter=json`
      : "npx vitest run --reporter=json";
    const result = await this.runCommand(command, this.workspacePath);
    return parseTestOutput(result.stdout);
  }
}

function parseTestOutput(stdout: string): TestResult {
  const passMatch = stdout.match(/(\d+) passed/);
  const failMatch = stdout.match(/(\d+) failed/);
  const skipMatch = stdout.match(/(\d+) skipped/);
  return {
    passed: parseInt(passMatch?.[1] ?? "0", 10),
    failed: parseInt(failMatch?.[1] ?? "0", 10),
    skipped: parseInt(skipMatch?.[1] ?? "0", 10),
    failures: [],
    durationMs: 0,
  };
}

export default function create(settings: Record<string, unknown>): VSCodeIntegration {
  if (!settings.workspacePath) throw new Error("VSCode connector requires workspacePath");
  return new VSCodeIntegration(settings as unknown as VSCodeSettings);
}
