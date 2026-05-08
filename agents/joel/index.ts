/**
 * Joel - Frontend Engineer Agent
 *
 * Entry point. Joel listens for inbound events from any connected integration
 * and routes them to the right workflow. He doesn't respond instantly to every
 * message - he acknowledges, works, and comes back with proof.
 *
 * Lifecycle:
 *   1. An InboundEvent arrives (from Slack, Jira, Linear, email, schedule, etc.)
 *   2. Joel matches it to a workflow
 *   3. The workflow runs, pausing at approval gates
 *   4. On approval, the workflow resumes and closes out
 */

import { codeChangeWorkflow } from "../../workflows/code-change.js";
import { standupWorkflow } from "../../workflows/standup.js";
import type { Workflow, WorkflowContext, WorkflowState } from "../../workflows/types.js";
import type { InboundEvent, IntegrationRegistry } from "../../integrations/types.js";

const AGENT_ID = "joel";

const WORKFLOWS: Workflow[] = [
  standupWorkflow,
  codeChangeWorkflow,
  // Additional workflows will be added here:
  //   - access-request (when Joel discovers a missing permission mid-task)
  //   - design-to-code (Figma URL + instruction)
  //   - bug-fix (stack trace or Sentry link → investigate → fix → PR)
  //   - code-review (PR link → review → post comments)
];

export class Joel {
  private integrations: IntegrationRegistry;
  private pendingApprovals: Map<string, PendingApproval> = new Map();

  constructor(integrations: IntegrationRegistry) {
    this.integrations = integrations;
  }

  /**
   * Handle an inbound event. This is the main entry point.
   * Call this from your Slack event handler, Jira webhook, cron job, etc.
   */
  async handle(event: InboundEvent): Promise<void> {
    // Check if this is an approval response to a pending workflow
    if (this.isApprovalResponse(event)) {
      await this.handleApproval(event);
      return;
    }

    // Find a matching workflow
    const workflow = WORKFLOWS.find(w => w.matches(event));
    if (!workflow) {
      console.log(`[joel] No workflow matched event: ${event.type} / "${event.rawText?.slice(0, 80)}"`);
      return;
    }

    console.log(`[joel] Matched workflow: ${workflow.id} for event: ${event.type}`);

    const state: WorkflowState = {};
    const ctx = this.buildContext(event, state);

    try {
      const result = await workflow.run(ctx);
      console.log(`[joel] Workflow ${workflow.id} ended: ${result.status} - ${result.summary}`);

      if (result.status === "awaiting_approval") {
        this.pendingApprovals.set(result.state.approvalId as string, {
          workflowId: workflow.id,
          event,
          state: result.state,
          waitingSince: new Date(),
        });
      }
    } catch (err) {
      console.error(`[joel] Workflow ${workflow.id} threw:`, err);
      // Post a failure message to the originating channel so humans know
      await this.postFailure(event, err);
    }
  }

  private buildContext(event: InboundEvent, state: WorkflowState): WorkflowContext {
    return {
      triggerEvent: event,
      agentId: AGENT_ID,
      integrations: this.integrations,
      state,
      log: (msg: string) => console.log(`  [joel/${event.type}] ${msg}`),
    };
  }

  private isApprovalResponse(event: InboundEvent): boolean {
    if (event.type !== "slack.message" && event.type !== "teams.message") return false;
    const text = event.rawText?.toLowerCase() ?? "";
    return (
      text.includes("lgtm") ||
      text.includes("approved") ||
      text.includes("ship it") ||
      text.includes(":white_check_mark:") ||
      text.includes("✅")
    );
  }

  private async handleApproval(event: InboundEvent): Promise<void> {
    // Find the pending approval that matches this channel + actor
    const pending = [...this.pendingApprovals.values()].find(
      p =>
        p.event.channelOrContext === event.channelOrContext &&
        (p.event.sourceId === event.payload.threadTs || p.event.sourceId === event.sourceId),
    );

    if (!pending) {
      console.log("[joel] Approval received but no matching pending workflow found");
      return;
    }

    const workflow = WORKFLOWS.find(w => w.id === pending.workflowId);
    if (!workflow) return;

    console.log(`[joel] Approval received for workflow ${pending.workflowId} from ${event.actor.handle}`);

    // Resume with approval context
    const state: WorkflowState = {
      ...pending.state,
      approvedBy: event.actor.handle,
    };

    const ctx = this.buildContext(pending.event, state);

    // For code-change workflow: skip straight to post-approval steps
    if (workflow.id === "code-change") {
      await this.resumeCodeChangePostApproval(ctx);
    }

    // Remove from pending
    this.pendingApprovals.delete(state.approvalId as string);
  }

  private async resumeCodeChangePostApproval(ctx: WorkflowContext): Promise<void> {
    // Import and run just the post-approval steps
    const { codeChangeWorkflow } = await import("../../workflows/code-change.js");
    await codeChangeWorkflow.run(ctx);
  }

  private async postFailure(event: InboundEvent, err: unknown): Promise<void> {
    const messaging = this.integrations.get<import("../../integrations/types.js").MessagingIntegration>("messaging");
    if (!messaging) return;
    await messaging.postThreadReply(
      event.channelOrContext,
      event.sourceId,
      `Hit an unexpected error on this one. I've logged it - someone should check the bench logs.`,
    ).catch(() => {/* best effort */});
  }
}

interface PendingApproval {
  workflowId: string;
  event: InboundEvent;
  state: WorkflowState;
  waitingSince: Date;
}
