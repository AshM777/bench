/**
 * Central connector catalog types (Bench Phase -1).
 * UI and docs should stay aligned with {@link CONNECTOR_CATALOG}.
 */

export type ConnectorCategory =
  | "team_chat"
  | "email_calendar"
  | "meetings"
  | "code_repo"
  | "work_tracking"
  | "docs_wiki"
  | "devtools_cloud"
  | "identity_access";

/** Typical posture when hiring a coworker — not a hard enforcement flag in V1. */
export type ConnectorTypicalImportance = "required" | "recommended" | "optional";

export interface ConnectorDefinition {
  id: string;
  /**
   * Optional key for the board UI (`tech-stack-icons` `StackIcon` `name`). Omit when no brand asset exists in that set.
   */
  stackIcon?: string;
  name: string;
  category: ConnectorCategory;
  description: string;
  typicalImportance: ConnectorTypicalImportance;
  /** Ordered checklist for IT / operator — product-specific wiring may ship incrementally. */
  setupSteps: string[];
  /** Short bullets focused on OAuth / tokens / admin consent (optional; UI falls back to generic guidance). */
  authenticationNotes?: string[];
  /** Optional vendor docs or admin consoles. */
  learnMoreUrl?: string;
  prerequisites?: string[];
}
