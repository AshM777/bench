import type { InboundEvent, OperationResult, IntegrationRegistry } from "../integrations/types.js";

/** A step in a workflow. Steps run sequentially; parallel steps are grouped in a StepGroup. */
export interface WorkflowStep {
  id: string;
  name: string;
  run(ctx: WorkflowContext): Promise<StepResult>;
}

export interface StepResult {
  status: "done" | "waiting_for_approval" | "blocked" | "failed" | "skipped";
  summary: string;           // what happened, in Joel's voice
  data?: Record<string, unknown>;
  approvalRequest?: ApprovalRequest;
  blockReason?: BlockInfo;
  operations?: OperationResult[];
}

/** Approval gate - Joel pauses here and posts proof. Human approves to continue. */
export interface ApprovalRequest {
  requestedFrom: string;     // Slack handle, email, etc.
  channel: string;           // where to post the request
  message: string;           // what Joel says
  evidence: ApprovalEvidence[];
  timeoutHours?: number;     // if no response, escalate after this many hours
  onTimeout?: "escalate" | "proceed" | "abandon";
}

export interface ApprovalEvidence {
  type: "screenshot" | "url" | "diff" | "test_results" | "text";
  label: string;
  value: string;
}

/** When Joel is blocked (missing access, waiting on someone) - he doesn't stop, he routes. */
export interface BlockInfo {
  system: string;
  reason: string;
  selfResolvable: boolean;   // can Joel file the request and continue?
  resolutionSteps?: string[];
  estimatedUnblockTime?: string;
}

/** Everything a workflow step needs to do its job. */
export interface WorkflowContext {
  triggerEvent: InboundEvent;
  agentId: string;           // "joel"
  taskId?: string;           // bench task ID if one was created
  integrations: IntegrationRegistry;
  state: WorkflowState;
  log(message: string): void;
  updateTaskStatus?(status: string, note?: string): Promise<void>;
}

/** Mutable bag of state that accumulates as the workflow runs. */
export interface WorkflowState {
  parsed?: ParsedIntent;
  branch?: string;
  changedFiles?: string[];
  ciStatus?: string;
  previewUrl?: string;
  screenshotUrl?: string;
  prUrl?: string;
  prNumber?: number;
  ticketId?: string;
  approvalId?: string;
  approvedBy?: string;
  [key: string]: unknown;
}

/** What Joel understands from the inbound message. */
export interface ParsedIntent {
  instruction: string;       // normalized instruction
  targetRepo?: string;
  targetBranch?: string;
  linkedTicketId?: string;
  figmaUrl?: string;
  urgency: "low" | "normal" | "high" | "critical";
  ambiguous: boolean;        // if true, Joel makes a reasonable assumption and calls it out
  assumptionsMade?: string[];
}

/** A complete workflow definition. */
export interface Workflow {
  id: string;
  name: string;
  /** Whether this workflow matches a given inbound event. */
  matches(event: InboundEvent): boolean;
  steps: WorkflowStep[];
  run(ctx: WorkflowContext): Promise<WorkflowResult>;
}

export interface WorkflowResult {
  workflowId: string;
  status: "completed" | "awaiting_approval" | "blocked" | "failed";
  completedSteps: string[];
  currentStep?: string;
  summary: string;
  state: WorkflowState;
}
