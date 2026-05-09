import type { CoworkerRole } from "@bench/shared";
import { COWORKER_ROLE_LABELS, HIRABLE_COWORKER_ROLES } from "@bench/shared";

/** Roles managers may request for a new hire (company Admin hire is operator-owned). */
export const HIRE_REQUEST_STANDARD_ROLES = HIRABLE_COWORKER_ROLES;

type HirableCoworkerRole = Exclude<CoworkerRole, "admin">;

/** Short capability blurbs for hire-request UX (not enforced by the API). */
export const ROLE_HIRE_CAPABILITY_SUMMARY: Record<HirableCoworkerRole, string> = {
  security: "Policy interpretation, access posture, and risk-aware guidance.",
  engineer: "Hands-on implementation, code context, PR-sized engineering tasks.",
  designer: "UX/UI exploration, specs, critique, and visual communication.",
  pm: "Roadmap framing, requirements synthesis, and stakeholder-ready updates.",
  qa: "Test strategy, quality gates, regression and release readiness.",
  devops: "CI/CD, infra hygiene, reliability, and deployment workflows.",
  researcher: "Discovery, desk research, competitive scans, synthesized findings.",
  general: "Flexible delegate without a specialized lane — general execution support.",
};

export function generateHireRequestTicketId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `HIRE-${hex}`;
}

export function buildHireRequestIssueBody(input: {
  ticketId: string;
  managerEmail: string | null;
  kind: "standard" | "custom";
  role?: HirableCoworkerRole;
  customRoleName?: string;
  customCapabilities?: string;
  notes: string;
}): string {
  const lines: string[] = [
    "## Hire request ticket",
    "",
    `**Ticket ID:** \`${input.ticketId}\``,
    "",
    input.managerEmail
      ? `**Requested by (manager):** ${input.managerEmail}`
      : "**Requested by (manager):** _(session email unavailable)_",
    "",
    "---",
    "",
  ];

  if (input.kind === "standard" && input.role) {
    const label = COWORKER_ROLE_LABELS[input.role];
    lines.push(
      "### Request type",
      "",
      "Standard Bench role",
      "",
      `- **Role:** ${label} (\`${input.role}\`)`,
      "",
      "### Typical capabilities (reference)",
      "",
      ROLE_HIRE_CAPABILITY_SUMMARY[input.role],
      "",
    );
  } else {
    lines.push(
      "### Request type",
      "",
      "Custom role",
      "",
      `- **Proposed role name:** ${input.customRoleName?.trim() || "_(not provided)_"}`,
      "",
      "### Expected capabilities / responsibilities",
      "",
      input.customCapabilities?.trim() || "_(not provided)_",
      "",
    );
  }

  lines.push(
    "### Additional context",
    "",
    input.notes.trim() || "_None_",
    "",
    "---",
    "",
    "**Admin:** This ticket is for review. Create the hire (adapter, budget, instructions) and set **people manager email** (`benchManagerEmail`) so the requester sees the coworker in Manager view. Comment here when done.",
  );

  return lines.join("\n");
}
