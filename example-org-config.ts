/**
 * Example: wiring up Joel for a Slack + GitHub + Jira + Vercel + Cursor org.
 *
 * Copy this, fill in your credentials (use env vars - never hardcode tokens),
 * and plug it into your server/webhook handler.
 */

import { buildRegistry } from "./integrations/registry.js";
import { Joel } from "./agents/joel/index.js";
import type { OrgIntegrationConfig, InboundEvent } from "./integrations/types.js";

const orgConfig: OrgIntegrationConfig = {
  orgId: "acme",
  orgName: "Acme Corp",
  activeIntegrations: ["slack", "github", "jira", "vercel", "cursor", "figma"],
  integrationSettings: {
    slack: {
      botToken: process.env.SLACK_BOT_TOKEN!,
      signingSecret: process.env.SLACK_SIGNING_SECRET,
    },
    github: {
      token: process.env.GITHUB_TOKEN!,
      defaultOrg: "acme-corp",
    },
    jira: {
      baseUrl: process.env.JIRA_BASE_URL!,         // https://acme.atlassian.net
      email: process.env.JIRA_EMAIL!,
      apiToken: process.env.JIRA_API_TOKEN!,
    },
    vercel: {
      token: process.env.VERCEL_TOKEN!,
      teamId: process.env.VERCEL_TEAM_ID,
      screenshotApiUrl: process.env.SCREENSHOT_API_URL,  // optional
    },
    cursor: {
      workspacePath: process.env.CURSOR_WORKSPACE_PATH!, // /home/joel/repos/acme-frontend
    },
    figma: {
      accessToken: process.env.FIGMA_ACCESS_TOKEN!,
    },
  },
  preferences: {
    messaging: "slack",
    ticketing: "jira",
    vcs: "github",
    deployment: "vercel",
    ide: "cursor",
  },
};

// Bootstrap
const registry = await buildRegistry(orgConfig);
const joel = new Joel(registry);

// --- Wire to your Slack Events API webhook ---
// In your Express/Hono/Fastify route:
export async function handleSlackEvent(slackPayload: Record<string, unknown>) {
  const event = slackPayload.event as Record<string, unknown>;
  if (!event) return;

  // Only process messages that mention @joel or are DMs to Joel
  const text = event.text as string ?? "";
  const isMentioned = text.includes("@joel") || (slackPayload.channel_type === "im");
  if (!isMentioned) return;

  const inboundEvent: InboundEvent = {
    integration: "slack",
    type: `slack.${event.type}`,
    timestamp: new Date((parseFloat(event.ts as string)) * 1000),
    sourceId: event.ts as string,
    channelOrContext: event.channel as string,
    actor: {
      name: event.user as string, // resolve to display name in prod
      handle: event.user as string,
    },
    payload: event,
    rawText: text.replace(/<@[A-Z0-9]+>/g, "").trim(), // strip @mentions
  };

  await joel.handle(inboundEvent);
}

// --- Wire to Jira webhooks ---
export async function handleJiraEvent(jiraPayload: Record<string, unknown>) {
  if (jiraPayload.webhookEvent !== "jira:issue_assigned") return;

  const issue = jiraPayload.issue as Record<string, unknown>;
  const fields = issue.fields as Record<string, unknown>;
  const assignee = fields.assignee as Record<string, string> | null;

  if (!assignee || assignee.accountId !== process.env.JOEL_JIRA_ACCOUNT_ID) return;

  const inboundEvent: InboundEvent = {
    integration: "jira",
    type: "jira.issue_assigned",
    timestamp: new Date(),
    sourceId: issue.key as string,
    channelOrContext: (fields.project as Record<string, string>).key,
    actor: {
      name: (jiraPayload.user as Record<string, string>)?.displayName ?? "Jira",
      handle: (jiraPayload.user as Record<string, string>)?.emailAddress ?? "jira",
    },
    payload: jiraPayload,
    rawText: [fields.summary, fields.description].filter(Boolean).join("\n") as string,
  };

  await joel.handle(inboundEvent);
}

// --- Wire to standup schedule ---
// Call this at standup time from a cron job or scheduler
export async function triggerStandup() {
  const inboundEvent: InboundEvent = {
    integration: "schedule",
    type: "schedule.standup",
    timestamp: new Date(),
    sourceId: `standup-${new Date().toISOString().split("T")[0]}`,
    channelOrContext: process.env.STANDUP_CHANNEL ?? "standup",
    actor: { name: "scheduler", handle: "scheduler" },
    payload: {},
  };

  await joel.handle(inboundEvent);
}
