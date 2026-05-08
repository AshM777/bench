/**
 * Core integration interface. Every connector in bench implements this contract.
 * An integration is a two-way bridge: it can receive events (triggers) and
 * execute actions (operations). Joel talks to all of them through this interface.
 */

export type IntegrationId = string; // e.g. "slack", "github", "jira"

/** A message or event that arrived from an external system and should trigger agent work. */
export interface InboundEvent {
  integration: IntegrationId;
  type: string;           // e.g. "slack.message", "jira.issue_assigned", "email.received"
  timestamp: Date;
  sourceId: string;       // native ID in the external system (Slack message ts, Jira issue key)
  channelOrContext: string; // Slack channel, email thread, Jira project key, etc.
  actor: {
    name: string;
    handle: string;       // @mention, email, etc.
  };
  payload: Record<string, unknown>;
  rawText?: string;       // human-readable summary for agents that need to interpret it
}

/** Result of an operation Joel performed via an integration. */
export interface OperationResult {
  success: boolean;
  integrationId: IntegrationId;
  operationId: string;    // e.g. "post_message", "create_pr", "close_ticket"
  externalRef?: string;   // URL, ticket ID, PR number, etc.
  summary: string;        // human-readable one-liner of what happened
  data?: Record<string, unknown>;
  error?: string;
}

/** An integration that Joel can send messages or post updates through. */
export interface MessagingIntegration {
  id: IntegrationId;
  postMessage(channel: string, text: string, options?: MessageOptions): Promise<OperationResult>;
  postThreadReply(channel: string, threadId: string, text: string): Promise<OperationResult>;
  postFileOrSnippet?(channel: string, content: string, filename: string): Promise<OperationResult>;
}

export interface MessageOptions {
  attachments?: MessageAttachment[];
  mentionUsers?: string[];
  unfurlLinks?: boolean;
}

export interface MessageAttachment {
  title?: string;
  text?: string;
  url?: string;
  imageUrl?: string;
  color?: string; // hex or "good" | "warning" | "danger"
}

/** An integration for version control and code review. */
export interface VCSIntegration {
  id: IntegrationId;
  createPR(params: CreatePRParams): Promise<OperationResult>;
  getRepo(repoId: string): Promise<RepoInfo>;
  getBranch(repoId: string, branch: string): Promise<BranchInfo>;
  checkCIStatus(repoId: string, sha: string): Promise<CIStatus>;
  mergePR?(repoId: string, prId: string): Promise<OperationResult>;
}

export interface CreatePRParams {
  repoId: string;
  title: string;
  body: string;
  headBranch: string;
  baseBranch: string;
  reviewers?: string[];
  labels?: string[];
  draftUntilApproved?: boolean;
}

export interface RepoInfo {
  id: string;
  name: string;
  defaultBranch: string;
  url: string;
}

export interface BranchInfo {
  name: string;
  sha: string;
  url: string;
}

export interface CIStatus {
  state: "pending" | "running" | "success" | "failure" | "cancelled";
  checkRuns: CICheckRun[];
  url: string;
}

export interface CICheckRun {
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion?: "success" | "failure" | "skipped" | "cancelled";
  url: string;
}

/** An integration for ticket/issue management. */
export interface TicketingIntegration {
  id: IntegrationId;
  getTicket(ticketId: string): Promise<TicketInfo>;
  updateTicket(ticketId: string, update: TicketUpdate): Promise<OperationResult>;
  closeTicket(ticketId: string, resolution?: string): Promise<OperationResult>;
  createTicket(params: CreateTicketParams): Promise<OperationResult>;
  addComment(ticketId: string, comment: string): Promise<OperationResult>;
  assignTicket(ticketId: string, assignee: string): Promise<OperationResult>;
  linkTicket?(ticketId: string, linkedTicketId: string, linkType: string): Promise<OperationResult>;
}

export interface TicketInfo {
  id: string;
  title: string;
  description: string;
  status: string;
  assignee?: string;
  reporter: string;
  priority?: string;
  labels?: string[];
  url: string;
  acceptanceCriteria?: string[];
}

export interface TicketUpdate {
  status?: string;
  title?: string;
  description?: string;
  priority?: string;
  labels?: string[];
}

export interface CreateTicketParams {
  projectId: string;
  title: string;
  description: string;
  type?: string;
  priority?: string;
  assignee?: string;
  labels?: string[];
  parentTicketId?: string;
}

/** An integration for deploying and previewing builds. */
export interface DeploymentIntegration {
  id: IntegrationId;
  getPreviewUrl(deploymentId: string): Promise<string>;
  triggerDeployment(params: DeployParams): Promise<OperationResult>;
  getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus>;
  captureScreenshot?(url: string): Promise<ScreenshotResult>;
}

export interface DeployParams {
  projectId: string;
  branch: string;
  environment: "preview" | "staging" | "production";
}

export interface DeploymentStatus {
  id: string;
  state: "building" | "ready" | "error" | "cancelled";
  url?: string;
  buildLog?: string;
}

export interface ScreenshotResult {
  url: string;       // URL of the screenshot image
  dataUri?: string;  // base64 data URI for inline display
  capturedAt: Date;
}

/** An integration for operating an IDE (Cursor, VS Code). */
export interface IDEIntegration {
  id: IntegrationId;
  openFile(filePath: string): Promise<OperationResult>;
  applyChange(params: CodeChangeParams): Promise<OperationResult>;
  runCommand(command: string, cwd?: string): Promise<CommandResult>;
  runTests(pattern?: string): Promise<TestResult>;
}

export interface CodeChangeParams {
  repoPath: string;
  filePath: string;
  instruction: string; // natural language or diff
  context?: string;    // surrounding context, ticket description, etc.
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export interface TestResult {
  passed: number;
  failed: number;
  skipped: number;
  failures: TestFailure[];
  durationMs: number;
}

export interface TestFailure {
  test: string;
  message: string;
  file?: string;
}

/** An integration for accessing design files and assets. */
export interface DesignIntegration {
  id: IntegrationId;
  getDesign(fileId: string, nodeId?: string): Promise<DesignSpec>;
  exportAsset(fileId: string, nodeId: string, format: "png" | "svg" | "pdf"): Promise<string>;
}

export interface DesignSpec {
  id: string;
  name: string;
  thumbnailUrl?: string;
  components: DesignComponent[];
  tokens?: Record<string, string>; // design tokens
}

export interface DesignComponent {
  id: string;
  name: string;
  description?: string;
  variants?: string[];
}

/** An integration for calendar and meeting management. */
export interface CalendarIntegration {
  id: IntegrationId;
  getUpcomingEvents(lookaheadHours?: number): Promise<CalendarEvent[]>;
  joinMeeting(meetingId: string): Promise<OperationResult>;
  postMeetingNotes?(meetingId: string, notes: string): Promise<OperationResult>;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  meetingUrl?: string;
  isStandup: boolean;
}

/** Access request - what Joel files when he hits an auth wall. */
export interface AccessRequest {
  system: string;           // e.g. "Vercel", "AWS Console", "Figma org"
  reason: string;           // what Joel needs it for
  urgency: "blocking" | "non-blocking";
  requestedFrom?: string;   // handle of the system owner if known
  ticketId?: string;        // tracking ticket Joel created
}

/** The registry — maps integration IDs to their implementations for a given org config. */
export interface IntegrationRegistry {
  messaging: Record<string, MessagingIntegration>;
  vcs: Record<string, VCSIntegration>;
  ticketing: Record<string, TicketingIntegration>;
  deployment: Record<string, DeploymentIntegration>;
  ide: Record<string, IDEIntegration>;
  design: Record<string, DesignIntegration>;
  calendar: Record<string, CalendarIntegration>;

  /** Resolve the right integration for a given category based on org config. */
  get<T>(category: keyof IntegrationRegistry, preferredId?: string): T | undefined;
}

/** Org-level config - which integrations are active and how they're configured. */
export interface OrgIntegrationConfig {
  orgId: string;
  orgName: string;
  activeIntegrations: IntegrationId[];
  integrationSettings: Record<IntegrationId, Record<string, unknown>>;
  /** Preferred tool per category - overrides defaults for this org. */
  preferences: {
    messaging?: IntegrationId;     // "slack" | "teams"
    ticketing?: IntegrationId;     // "jira" | "linear" | "github-issues"
    vcs?: IntegrationId;           // "github" | "gitlab" | "bitbucket"
    deployment?: IntegrationId;    // "vercel" | "netlify" | "aws-amplify"
    ide?: IntegrationId;           // "cursor" | "vscode"
    calendar?: IntegrationId;      // "google-workspace" | "outlook"
  };
}
