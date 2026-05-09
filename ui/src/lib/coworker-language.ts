/** Product copy: domain remains `agent` / routes `/agents`; UI uses “coworker” language. */

export const CX = {
  coworker: "coworker",
  coworkers: "coworkers",
  Coworkers: "Coworkers",
  newCoworker: "New coworker",
  hireCoworker: "Hire coworker",
  /** Issue title prefix; ticket id is appended in parentheses in the hire-request flow. */
  requestHireTitle: "Request: hire a new coworker",
  /** Fallback body when opening a blank hire issue (e.g. Admin dialog shortcut). */
  requestHireDescription:
    "Describe the role, tools, and timeline. Your company **Admin** coworker will create the hire and set **people manager email** so this lands in the right Manager view.\n\nInclude: team, systems (Slack/GitHub/etc.), access level, and urgency.",
  adminLeadLabel: "Admin",
  adminLeadBlurb:
    "Company Admin is the founding coworker in Bench. They review hire tickets and configure adapters, budget extensions, and manager assignment.",
} as const;
