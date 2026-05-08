/**
 * Cursor IDE connector.
 * Required env / config:
 *   CURSOR_WORKSPACE_PATH  - absolute path to the repo Cursor should work in
 *
 * How Joel uses Cursor:
 *   - Opens the repo in a Cursor workspace
 *   - Applies changes by driving the Cursor CLI / background agent mode
 *   - Runs terminal commands via Cursor's integrated terminal
 *   - Runs the test suite and collects results
 *
 * Under the hood this shells out to the Cursor CLI or invokes Cursor's
 * background agent API when available. Falls back to direct file edits + shell
 * for simpler operations.
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

interface CursorSettings {
  workspacePath: string;
  cursorBin?: string; // path to cursor CLI, defaults to "cursor"
}

class CursorIntegration implements IDEIntegration {
  id = "cursor";
  private workspacePath: string;
  private cursorBin: string;

  constructor(settings: CursorSettings) {
    this.workspacePath = settings.workspacePath;
    this.cursorBin = settings.cursorBin ?? "cursor";
  }

  async openFile(filePath: string): Promise<OperationResult> {
    const result = await this.runCommand(`${this.cursorBin} ${filePath}`, this.workspacePath);
    return {
      success: result.exitCode === 0,
      integrationId: this.id,
      operationId: "open_file",
      summary: result.exitCode === 0 ? `Opened ${filePath}` : `Failed to open ${filePath}`,
      error: result.exitCode !== 0 ? result.stderr : undefined,
    };
  }

  async applyChange(params: CodeChangeParams): Promise<OperationResult> {
    const repoPath = params.repoPath === "auto" || params.repoPath === "."
      ? this.workspacePath
      : params.repoPath;

    // Use Cursor's background agent to apply the change.
    // The instruction becomes the prompt; Cursor handles file selection.
    const prompt = [
      params.instruction,
      params.context ? `\n\nContext: ${params.context}` : "",
    ].join("");

    // Cursor CLI: cursor --background-agent "instruction" --workspace /path/to/repo
    const args = [
      "--background-agent",
      prompt,
      "--workspace",
      repoPath,
    ];

    try {
      const { stdout, stderr } = await execFileAsync(this.cursorBin, args, {
        cwd: repoPath,
        timeout: 5 * 60 * 1000, // 5 min max for a single change
      });

      // Parse changed files from Cursor's output (format TBD based on Cursor CLI output)
      const changedFiles = parseChangedFiles(stdout);

      return {
        success: true,
        integrationId: this.id,
        operationId: "apply_change",
        summary: `Change applied. ${changedFiles.length} file(s) modified.`,
        data: { changedFiles, stdout, stderr },
      };
    } catch (err: unknown) {
      const error = err as { stdout?: string; stderr?: string; message?: string };
      return {
        success: false,
        integrationId: this.id,
        operationId: "apply_change",
        summary: `Change failed`,
        error: error.stderr ?? error.message ?? String(err),
      };
    }
  }

  async runCommand(command: string, cwd?: string): Promise<CommandResult> {
    const start = Date.now();
    const workingDir = cwd ?? this.workspacePath;

    try {
      const [bin, ...args] = command.split(/\s+/);
      const { stdout, stderr } = await execFileAsync(bin, args, {
        cwd: workingDir,
        timeout: 2 * 60 * 1000,
      });
      return { stdout, stderr, exitCode: 0, durationMs: Date.now() - start };
    } catch (err: unknown) {
      const error = err as { stdout?: string; stderr?: string; code?: number };
      return {
        stdout: error.stdout ?? "",
        stderr: error.stderr ?? String(err),
        exitCode: error.code ?? 1,
        durationMs: Date.now() - start,
      };
    }
  }

  async runTests(pattern?: string): Promise<TestResult> {
    const command = pattern
      ? `npx vitest run ${pattern} --reporter=json`
      : "npx vitest run --reporter=json";

    const result = await this.runCommand(command, this.workspacePath);
    return parseVitestOutput(result.stdout, result.stderr);
  }
}

function parseChangedFiles(cursorOutput: string): string[] {
  // Parse Cursor CLI output for modified files.
  // Pattern subject to change based on actual Cursor CLI output format.
  const lines = cursorOutput.split("\n");
  return lines
    .filter(l => l.startsWith("  modified:") || l.startsWith("  created:"))
    .map(l => l.replace(/\s+(modified|created):\s+/, "").trim());
}

function parseVitestOutput(stdout: string, stderr: string): TestResult {
  try {
    // Vitest JSON reporter outputs a JSON object
    const jsonStart = stdout.indexOf("{");
    if (jsonStart >= 0) {
      const json = JSON.parse(stdout.slice(jsonStart)) as Record<string, unknown>;
      const testResults = (json.testResults as Record<string, unknown>[]) ?? [];
      let passed = 0, failed = 0, skipped = 0;
      const failures: TestResult["failures"] = [];

      for (const suite of testResults) {
        const assertionResults = (suite.assertionResults as Record<string, unknown>[]) ?? [];
        for (const test of assertionResults) {
          if (test.status === "passed") passed++;
          else if (test.status === "failed") {
            failed++;
            failures.push({
              test: test.fullName as string,
              message: ((test.failureMessages as string[]) ?? []).join("\n"),
              file: suite.testFilePath as string,
            });
          } else skipped++;
        }
      }

      return { passed, failed, skipped, failures, durationMs: (json.startTime as number) ?? 0 };
    }
  } catch {
    // Fall through to regex parsing
  }

  // Fallback: parse Vitest's human-readable output
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

export default function create(settings: Record<string, unknown>): CursorIntegration {
  if (!settings.workspacePath) throw new Error("Cursor connector requires workspacePath");
  return new CursorIntegration(settings as unknown as CursorSettings);
}
