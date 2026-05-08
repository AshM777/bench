/**
 * The "Joel gets a request and ships it" workflow.
 *
 * Trigger:  Slack message (or Jira assignment, email, Teams message) asking Joel to
 *           change something in the frontend.
 *
 * Flow:
 *   1. Acknowledge            → "On it. I'll post a preview once it's ready."
 *   2. Parse intent           → understand what to change, link to ticket/Figma
 *   3. Branch                 → create a feature branch
 *   4. Implement              → open IDE, make the change
 *   5. Test                   → run tests + CI, fix failures
 *   6. Deploy preview         → get a staging URL
 *   7. Capture screenshot     → visual proof
 *   8. Request approval       → post to Slack with evidence, wait for thumbs up
 *   9. Raise PR               → only after approval
 *  10. Close ticket           → only after PR is merged (or raised, depending on org config)
 *  11. Post outcome           → reply in original thread with PR link + ticket closed
 */

import type {
  Workflow,
  WorkflowStep,
  WorkflowContext,
  WorkflowResult,
  StepResult,
  ParsedIntent,
} from "./types.js";
import type { InboundEvent } from "../integrations/types.js";

// ─── Step: Acknowledge ──────────────────────────────────────────────────────

const acknowledgeStep: WorkflowStep = {
  id: "acknowledge",
  name: "Acknowledge the request",
  async run(ctx) {
    const messaging = ctx.integrations.get<import("../integrations/types.js").MessagingIntegration>("messaging");
    if (!messaging) {
      // No messaging integration configured - log and continue silently
      ctx.log("No messaging integration available for acknowledgment");
      return { status: "done", summary: "Acknowledged (silently - no messaging integration configured)" };
    }

    const { channelOrContext, sourceId } = ctx.triggerEvent;

    await messaging.postThreadReply(
      channelOrContext,
      sourceId,
      "On it. I'll post a preview once it's ready.",
    );

    return { status: "done", summary: "Acknowledged in thread" };
  },
};

// ─── Step: Parse Intent ─────────────────────────────────────────────────────

const parseIntentStep: WorkflowStep = {
  id: "parse_intent",
  name: "Parse and understand the request",
  async run(ctx) {
    const raw = ctx.triggerEvent.rawText ?? "";
    const parsed = parseIntent(raw, ctx.triggerEvent.payload);

    ctx.state.parsed = parsed;

    if (parsed.linkedTicketId) {
      ctx.state.ticketId = parsed.linkedTicketId;
    }

    let summary = `Instruction: "${parsed.instruction}"`;
    if (parsed.ambiguous && parsed.assumptionsMade?.length) {
      summary += `. Assumptions: ${parsed.assumptionsMade.join("; ")}`;
    }

    return { status: "done", summary, data: { parsed } };
  },
};

function parseIntent(rawText: string, payload: Record<string, unknown>): ParsedIntent {
  // Extract ticket IDs (Jira: ABC-123, Linear: ENG-456, GitHub: #789)
  const ticketMatch = rawText.match(/\b([A-Z]+-\d+|#\d+)\b/);
  const figmaMatch = rawText.match(/figma\.com\/[^\s]+/);

  // Urgency signals
  const urgencyKeywords = {
    critical: /\b(critical|urgent|asap|down|broken|outage|incident)\b/i,
    high: /\b(high|priority|today|blocker|blocking)\b/i,
    low: /\b(low|whenever|nice.to.have|backlog)\b/i,
  };
  const urgency =
    urgencyKeywords.critical.test(rawText) ? "critical"
    : urgencyKeywords.high.test(rawText) ? "high"
    : urgencyKeywords.low.test(rawText) ? "low"
    : "normal";

  // Detect ambiguity - very short requests or missing specifics
  const ambiguous = rawText.trim().split(/\s+/).length < 6;
  const assumptionsMade = ambiguous
    ? ["Applying change to the main app repo on the default base branch. Will call out in preview if this seems wrong."]
    : undefined;

  return {
    instruction: rawText.trim(),
    linkedTicketId: ticketMatch?.[1],
    figmaUrl: figmaMatch?.[0],
    urgency,
    ambiguous,
    assumptionsMade,
    targetRepo: (payload.repo as string) ?? undefined,
    targetBranch: (payload.branch as string) ?? undefined,
  };
}

// ─── Step: Create Branch ─────────────────────────────────────────────────────

const createBranchStep: WorkflowStep = {
  id: "create_branch",
  name: "Create a feature branch",
  async run(ctx) {
    const parsed = ctx.state.parsed as ParsedIntent;
    const ticketId = ctx.state.ticketId ?? "task";

    // Branch name: joel/<ticket>-<slug>
    const slug = parsed.instruction
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40)
      .replace(/-$/, "");
    const branchName = `joel/${ticketId}-${slug}`;

    ctx.state.branch = branchName;
    ctx.log(`Creating branch: ${branchName}`);

    // The IDE integration will actually run `git checkout -b` in the repo
    const ide = ctx.integrations.get<import("../integrations/types.js").IDEIntegration>("ide");
    if (ide) {
      const result = await ide.runCommand(
        `git checkout -b ${branchName}`,
        parsed.targetRepo,
      );
      if (result.exitCode !== 0) {
        return {
          status: "failed",
          summary: `Branch creation failed: ${result.stderr}`,
        };
      }
    }

    return { status: "done", summary: `Branch created: ${branchName}` };
  },
};

// ─── Step: Implement the Change ──────────────────────────────────────────────

const implementStep: WorkflowStep = {
  id: "implement",
  name: "Implement the change in the IDE",
  async run(ctx) {
    const parsed = ctx.state.parsed as ParsedIntent;
    const ide = ctx.integrations.get<import("../integrations/types.js").IDEIntegration>("ide");

    if (!ide) {
      return {
        status: "blocked",
        summary: "No IDE integration configured",
        blockReason: {
          system: "IDE",
          reason: "No IDE integration is set up for this org",
          selfResolvable: false,
          resolutionSteps: ["Add a 'cursor' or 'vscode' integration to the org config"],
        },
      };
    }

    // If there's a Figma URL, fetch the design spec first for context
    let designContext = "";
    if (parsed.figmaUrl) {
      const design = ctx.integrations.get<import("../integrations/types.js").DesignIntegration>("design");
      if (design) {
        try {
          const fileId = extractFigmaFileId(parsed.figmaUrl);
          const spec = await design.getDesign(fileId);
          designContext = `\n\nDesign reference: ${spec.name}. Components: ${spec.components.map(c => c.name).join(", ")}.`;
        } catch {
          ctx.log("Could not fetch Figma spec - proceeding without it");
        }
      }
    }

    const instruction = parsed.instruction + designContext;

    const result = await ide.applyChange({
      repoPath: parsed.targetRepo ?? ".",
      filePath: "auto", // IDE will determine affected files
      instruction,
      context: ctx.state.ticketId
        ? `This is for ticket ${ctx.state.ticketId}.`
        : undefined,
    });

    if (!result.success) {
      return {
        status: "failed",
        summary: `Implementation failed: ${result.error}`,
        operations: [result],
      };
    }

    ctx.state.changedFiles = (result.data?.changedFiles as string[]) ?? [];

    return {
      status: "done",
      summary: `Change implemented. Files modified: ${ctx.state.changedFiles.join(", ") || "unknown"}`,
      operations: [result],
    };
  },
};

function extractFigmaFileId(url: string): string {
  const match = url.match(/figma\.com\/(?:design|file)\/([^/]+)/);
  return match?.[1] ?? url;
}

// ─── Step: Run Tests ─────────────────────────────────────────────────────────

const testStep: WorkflowStep = {
  id: "run_tests",
  name: "Run tests and CI checks",
  async run(ctx) {
    const ide = ctx.integrations.get<import("../integrations/types.js").IDEIntegration>("ide");
    if (!ide) {
      return { status: "skipped", summary: "No IDE integration - skipping local tests" };
    }

    const result = await ide.runTests();

    if (result.failed > 0) {
      // Joel tries to fix the failures before escalating
      ctx.log(`${result.failed} test(s) failed. Attempting auto-fix...`);

      // Run a second pass with the failures as context
      const parsed = ctx.state.parsed as ParsedIntent;
      const fixInstruction = [
        `Fix the following test failures:\n`,
        ...result.failures.map(f => `- ${f.test}: ${f.message}`),
      ].join("\n");

      await ide.applyChange({
        repoPath: parsed.targetRepo ?? ".",
        filePath: "auto",
        instruction: fixInstruction,
      });

      // Re-run
      const retryResult = await ide.runTests();
      if (retryResult.failed > 0) {
        return {
          status: "failed",
          summary: `${retryResult.failed} test(s) still failing after auto-fix attempt`,
          data: { failures: retryResult.failures },
        };
      }
    }

    ctx.state.ciStatus = "passing";
    return {
      status: "done",
      summary: `All tests passing (${result.passed} passed, ${result.skipped} skipped)`,
    };
  },
};

// ─── Step: Deploy Preview ────────────────────────────────────────────────────

const deployPreviewStep: WorkflowStep = {
  id: "deploy_preview",
  name: "Deploy to preview/staging",
  async run(ctx) {
    const deployment = ctx.integrations.get<import("../integrations/types.js").DeploymentIntegration>("deployment");

    if (!deployment) {
      return {
        status: "blocked",
        summary: "No deployment integration configured",
        blockReason: {
          system: "Deployment",
          reason: "No deployment integration (Vercel, Netlify, etc.) is configured",
          selfResolvable: true,
          resolutionSteps: [
            "Add a 'vercel' or 'netlify' integration to the org config",
            "Or: Joel will push the branch and let CI create the preview URL",
          ],
        },
      };
    }

    const deployResult = await deployment.triggerDeployment({
      projectId: "auto",  // deployment integration resolves from repo context
      branch: ctx.state.branch!,
      environment: "preview",
    });

    if (!deployResult.success) {
      return {
        status: "failed",
        summary: `Preview deployment failed: ${deployResult.error}`,
        operations: [deployResult],
      };
    }

    // Wait for the build and get the URL
    const status = await pollDeployment(deployment, deployResult.externalRef!);
    if (status.state !== "ready") {
      return {
        status: "failed",
        summary: `Preview build ended in state: ${status.state}`,
      };
    }

    ctx.state.previewUrl = status.url!;

    // Try to grab a screenshot for the approval message
    if (deployment.captureScreenshot) {
      try {
        const screenshot = await deployment.captureScreenshot(status.url!);
        ctx.state.screenshotUrl = screenshot.url;
      } catch {
        ctx.log("Screenshot capture failed - approval will use URL only");
      }
    }

    return {
      status: "done",
      summary: `Preview ready: ${ctx.state.previewUrl}`,
      operations: [deployResult],
    };
  },
};

async function pollDeployment(
  deployment: import("../integrations/types.js").DeploymentIntegration,
  deploymentId: string,
  maxWaitMs = 5 * 60 * 1000,
): Promise<import("../integrations/types.js").DeploymentStatus> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const status = await deployment.getDeploymentStatus(deploymentId);
    if (status.state === "ready" || status.state === "error" || status.state === "cancelled") {
      return status;
    }
    await new Promise(r => setTimeout(r, 10_000)); // poll every 10s
  }
  return { id: deploymentId, state: "error", buildLog: "Timed out waiting for deployment" };
}

// ─── Step: Request Approval ──────────────────────────────────────────────────

const requestApprovalStep: WorkflowStep = {
  id: "request_approval",
  name: "Post preview and request approval",
  async run(ctx) {
    const messaging = ctx.integrations.get<import("../integrations/types.js").MessagingIntegration>("messaging");
    if (!messaging) {
      // No messaging - auto-approve (headless mode, e.g. CI-triggered)
      ctx.state.approvedBy = "auto";
      return { status: "done", summary: "No messaging integration - auto-approved (headless mode)" };
    }

    const { channelOrContext, sourceId, actor } = ctx.triggerEvent;
    const previewUrl = ctx.state.previewUrl ?? "(preview URL unavailable)";
    const evidence: import("./types.js").ApprovalEvidence[] = [
      { type: "url", label: "Preview", value: previewUrl },
    ];

    if (ctx.state.screenshotUrl) {
      evidence.push({ type: "screenshot", label: "Screenshot", value: ctx.state.screenshotUrl });
    }

    const parsed = ctx.state.parsed as ParsedIntent;
    let message = `Done. Preview is live: ${previewUrl}`;

    if (parsed.ambiguous && parsed.assumptionsMade?.length) {
      message += `\n\nAssumptions I made:\n${parsed.assumptionsMade.map(a => `- ${a}`).join("\n")}`;
    }

    message += `\n\nReply with :white_check_mark: or "LGTM" to ship it.`;

    await messaging.postThreadReply(channelOrContext, sourceId, message);

    // Store the approval request so the approval listener can match it
    ctx.state.approvalId = `${ctx.agentId}-${ctx.triggerEvent.sourceId}-${Date.now()}`;

    return {
      status: "waiting_for_approval",
      summary: `Waiting for approval from ${actor.handle}`,
      approvalRequest: {
        requestedFrom: actor.handle,
        channel: channelOrContext,
        message,
        evidence,
        timeoutHours: 24,
        onTimeout: "escalate",
      },
    };
  },
};

// ─── Step: Raise PR ──────────────────────────────────────────────────────────

const raisePRStep: WorkflowStep = {
  id: "raise_pr",
  name: "Raise a pull request",
  async run(ctx) {
    const vcs = ctx.integrations.get<import("../integrations/types.js").VCSIntegration>("vcs");
    if (!vcs) {
      return {
        status: "blocked",
        summary: "No VCS integration configured",
        blockReason: {
          system: "Version Control",
          reason: "No VCS integration (GitHub, GitLab, etc.) is configured",
          selfResolvable: false,
        },
      };
    }

    const parsed = ctx.state.parsed as ParsedIntent;
    const ticketRef = ctx.state.ticketId ? ` (${ctx.state.ticketId})` : "";
    const previewUrl = ctx.state.previewUrl ?? "";

    const prBody = [
      `## What`,
      parsed.instruction,
      ``,
      previewUrl ? `## Preview\n${previewUrl}` : null,
      ctx.state.screenshotUrl ? `\n![Preview screenshot](${ctx.state.screenshotUrl})` : null,
      ``,
      ctx.state.ticketId ? `## Closes\n${ctx.state.ticketId}` : null,
      ``,
      `---`,
      `_Raised by Joel (bench agent)${ctx.state.approvedBy ? ` - approved by @${ctx.state.approvedBy}` : ""}_`,
    ].filter(Boolean).join("\n");

    const prResult = await vcs.createPR({
      repoId: parsed.targetRepo ?? "auto",
      title: `${parsed.instruction.slice(0, 72)}${ticketRef}`,
      body: prBody,
      headBranch: ctx.state.branch!,
      baseBranch: parsed.targetBranch ?? "main",
      draftUntilApproved: false,
    });

    if (!prResult.success) {
      return {
        status: "failed",
        summary: `PR creation failed: ${prResult.error}`,
        operations: [prResult],
      };
    }

    ctx.state.prUrl = prResult.externalRef;
    ctx.state.prNumber = prResult.data?.number as number;

    return {
      status: "done",
      summary: `PR raised: ${prResult.externalRef}`,
      operations: [prResult],
    };
  },
};

// ─── Step: Close Ticket ──────────────────────────────────────────────────────

const closeTicketStep: WorkflowStep = {
  id: "close_ticket",
  name: "Close the originating ticket",
  async run(ctx) {
    if (!ctx.state.ticketId) {
      return { status: "skipped", summary: "No ticket linked - nothing to close" };
    }

    const ticketing = ctx.integrations.get<import("../integrations/types.js").TicketingIntegration>("ticketing");
    if (!ticketing) {
      return { status: "skipped", summary: "No ticketing integration - ticket not closed automatically" };
    }

    const prRef = ctx.state.prUrl
      ? `\n\nResolved in PR: ${ctx.state.prUrl}`
      : "";

    await ticketing.addComment(
      ctx.state.ticketId,
      `Done. ${prRef}\n\n_Closed by Joel._`,
    );

    const closeResult = await ticketing.closeTicket(ctx.state.ticketId, "done");

    return {
      status: closeResult.success ? "done" : "failed",
      summary: closeResult.success
        ? `Ticket ${ctx.state.ticketId} closed`
        : `Could not close ticket: ${closeResult.error}`,
      operations: [closeResult],
    };
  },
};

// ─── Step: Post Outcome ──────────────────────────────────────────────────────

const postOutcomeStep: WorkflowStep = {
  id: "post_outcome",
  name: "Post the final outcome to the original thread",
  async run(ctx) {
    const messaging = ctx.integrations.get<import("../integrations/types.js").MessagingIntegration>("messaging");
    if (!messaging) {
      return { status: "done", summary: "No messaging integration - outcome not posted" };
    }

    const { channelOrContext, sourceId } = ctx.triggerEvent;
    const lines: string[] = ["Shipped."];

    if (ctx.state.prUrl) lines.push(`PR: ${ctx.state.prUrl}`);
    if (ctx.state.ticketId) lines.push(`Ticket closed: ${ctx.state.ticketId}`);

    await messaging.postThreadReply(channelOrContext, sourceId, lines.join("\n"));

    return { status: "done", summary: "Outcome posted to thread" };
  },
};

// ─── Workflow Assembly ───────────────────────────────────────────────────────

export const codeChangeWorkflow: Workflow = {
  id: "code-change",
  name: "Frontend code change - end to end",

  matches(event: InboundEvent): boolean {
    // Matches any message directed at Joel asking for a UI/frontend change
    const text = (event.rawText ?? "").toLowerCase();
    const frontendKeywords = [
      "landing page", "ui", "frontend", "component", "style", "css",
      "layout", "button", "form", "page", "screen", "design", "figma",
      "modal", "sidebar", "header", "footer", "nav", "menu",
    ];
    return (
      event.type.startsWith("slack.message") ||
      event.type === "jira.issue_assigned" ||
      event.type === "linear.issue_assigned" ||
      event.type === "email.received"
    ) && frontendKeywords.some(kw => text.includes(kw));
  },

  steps: [
    acknowledgeStep,
    parseIntentStep,
    createBranchStep,
    implementStep,
    testStep,
    deployPreviewStep,
    requestApprovalStep,
    // raisePRStep and closeTicketStep run after approval - see run()
    postOutcomeStep,
  ],

  async run(ctx: WorkflowContext): Promise<WorkflowResult> {
    const completedSteps: string[] = [];
    let currentStep = "";

    const preApprovalSteps = [
      acknowledgeStep,
      parseIntentStep,
      createBranchStep,
      implementStep,
      testStep,
      deployPreviewStep,
      requestApprovalStep,
    ];

    for (const step of preApprovalSteps) {
      currentStep = step.id;
      ctx.log(`[${step.id}] Starting`);

      const result = await step.run(ctx);
      ctx.log(`[${step.id}] ${result.status}: ${result.summary}`);

      if (result.status === "waiting_for_approval") {
        completedSteps.push(step.id);
        return {
          workflowId: this.id,
          status: "awaiting_approval",
          completedSteps,
          currentStep: step.id,
          summary: result.summary,
          state: ctx.state,
        };
      }

      if (result.status === "failed") {
        return {
          workflowId: this.id,
          status: "failed",
          completedSteps,
          currentStep: step.id,
          summary: result.summary,
          state: ctx.state,
        };
      }

      if (result.status === "blocked") {
        const block = result.blockReason!;
        if (block.selfResolvable) {
          // Joel files the access request and continues with the next step
          ctx.log(`[${step.id}] Blocked on ${block.system} - filing access request and continuing`);
          await fileAccessRequest(ctx, block);
          completedSteps.push(step.id);
          continue;
        }
        return {
          workflowId: this.id,
          status: "blocked",
          completedSteps,
          currentStep: step.id,
          summary: block.reason,
          state: ctx.state,
        };
      }

      completedSteps.push(step.id);
    }

    // Post-approval steps run when the approval event arrives (resume)
    const postApprovalSteps = [raisePRStep, closeTicketStep, postOutcomeStep];
    for (const step of postApprovalSteps) {
      currentStep = step.id;
      ctx.log(`[${step.id}] Starting`);
      const result = await step.run(ctx);
      ctx.log(`[${step.id}] ${result.status}: ${result.summary}`);
      if (result.status === "failed") {
        return {
          workflowId: this.id,
          status: "failed",
          completedSteps,
          currentStep: step.id,
          summary: result.summary,
          state: ctx.state,
        };
      }
      completedSteps.push(step.id);
    }

    return {
      workflowId: this.id,
      status: "completed",
      completedSteps,
      summary: `Done. PR: ${ctx.state.prUrl ?? "n/a"} | Ticket: ${ctx.state.ticketId ?? "n/a"}`,
      state: ctx.state,
    };
  },
};

async function fileAccessRequest(
  ctx: WorkflowContext,
  block: import("./types.js").BlockInfo,
): Promise<void> {
  const ticketing = ctx.integrations.get<import("../integrations/types.js").TicketingIntegration>("ticketing");
  const messaging = ctx.integrations.get<import("../integrations/types.js").MessagingIntegration>("messaging");

  if (ticketing) {
    await ticketing.createTicket({
      projectId: "IT",
      title: `Access request: ${block.system}`,
      description: [
        `Joel (bench/frontend agent) needs access to: ${block.system}`,
        `Reason: ${block.reason}`,
        block.resolutionSteps?.length
          ? `Steps to resolve:\n${block.resolutionSteps.map(s => `- ${s}`).join("\n")}`
          : "",
      ].filter(Boolean).join("\n\n"),
      type: "access-request",
      priority: block.reason.toLowerCase().includes("block") ? "high" : "normal",
      assignee: "it-team",
    });
  }

  if (messaging) {
    const { channelOrContext, sourceId } = ctx.triggerEvent;
    await messaging.postThreadReply(
      channelOrContext,
      sourceId,
      `Heads up: I don't have access to ${block.system} yet. I've filed an IT ticket to get that sorted. Continuing with what I can in the meantime.`,
    );
  }
}
