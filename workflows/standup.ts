/**
 * Standup workflow. Joel joins standup (async or live), gives an update,
 * and takes actionables. This runs on a schedule - typically daily at standup time.
 *
 * Format (async Slack post or spoken in meeting):
 *   Yesterday: [completed items with links]
 *   Today: [active work]
 *   Blockers: [only real ones - Joel already tried to self-resolve]
 *   Actionables taken: [anything assigned in the meeting]
 */

import type {
  Workflow,
  WorkflowStep,
  WorkflowContext,
  WorkflowResult,
} from "./types.js";
import type { InboundEvent, CalendarEvent } from "../integrations/types.js";

interface StandupData {
  completedSinceLastStandup: CompletedItem[];
  inProgress: ActiveItem[];
  blockers: BlockerItem[];
  actionablesTaken: string[];
}

interface CompletedItem {
  summary: string;
  prUrl?: string;
  ticketId?: string;
}

interface ActiveItem {
  summary: string;
  ticketId?: string;
  eta?: string;
}

interface BlockerItem {
  description: string;
  pendingWith: string; // who/what is this waiting on
  ticketId?: string;  // the IT/access ticket Joel already filed
}

// ─── Step: Pull standup data ──────────────────────────────────────────────────

const pullStandupDataStep: WorkflowStep = {
  id: "pull_standup_data",
  name: "Pull completed and in-progress work",
  async run(ctx) {
    // In a real implementation this queries the bench task store
    // and the VCS integration for merged PRs since last standup.
    // Here we define the shape and let the runtime populate it.

    const data: StandupData = {
      completedSinceLastStandup: (ctx.state.completedItems as CompletedItem[]) ?? [],
      inProgress: (ctx.state.activeItems as ActiveItem[]) ?? [],
      blockers: (ctx.state.blockers as BlockerItem[]) ?? [],
      actionablesTaken: [],
    };

    ctx.state.standupData = data;

    return {
      status: "done",
      summary: `Pulled standup data: ${data.completedSinceLastStandup.length} completed, ${data.inProgress.length} in progress, ${data.blockers.length} blockers`,
    };
  },
};

// ─── Step: Format the update ─────────────────────────────────────────────────

const formatUpdateStep: WorkflowStep = {
  id: "format_update",
  name: "Format the standup update",
  async run(ctx) {
    const data = ctx.state.standupData as StandupData;
    const update = formatStandupText(data);
    ctx.state.standupText = update;

    return {
      status: "done",
      summary: "Standup update formatted",
      data: { update },
    };
  },
};

function formatStandupText(data: StandupData): string {
  const sections: string[] = [];

  if (data.completedSinceLastStandup.length > 0) {
    const items = data.completedSinceLastStandup.map(item => {
      const refs = [item.ticketId, item.prUrl].filter(Boolean).join(" | ");
      return `- ${item.summary}${refs ? ` (${refs})` : ""}`;
    });
    sections.push(`*Yesterday*\n${items.join("\n")}`);
  } else {
    sections.push(`*Yesterday*\n- No completed items to report`);
  }

  if (data.inProgress.length > 0) {
    const items = data.inProgress.map(item => {
      const meta = [item.ticketId, item.eta ? `ETA: ${item.eta}` : null].filter(Boolean).join(", ");
      return `- ${item.summary}${meta ? ` (${meta})` : ""}`;
    });
    sections.push(`*Today*\n${items.join("\n")}`);
  } else {
    sections.push(`*Today*\n- Picking up next priority from the backlog`);
  }

  if (data.blockers.length > 0) {
    const items = data.blockers.map(item => {
      return `- ${item.description} - waiting on ${item.pendingWith}${item.ticketId ? ` (${item.ticketId} filed)` : ""}`;
    });
    sections.push(`*Blockers*\n${items.join("\n")}`);
  }

  return sections.join("\n\n");
}

// ─── Step: Post or speak the update ──────────────────────────────────────────

const postUpdateStep: WorkflowStep = {
  id: "post_update",
  name: "Post update to standup channel or meeting",
  async run(ctx) {
    const text = ctx.state.standupText as string;
    const standupEvent = ctx.state.standupEvent as CalendarEvent | undefined;

    const messaging = ctx.integrations.get<import("../integrations/types.js").MessagingIntegration>("messaging");

    // If there's a live standup meeting, join it
    if (standupEvent?.meetingUrl) {
      const calendar = ctx.integrations.get<import("../integrations/types.js").CalendarIntegration>("calendar");
      if (calendar) {
        await calendar.joinMeeting(standupEvent.id);
        if (calendar.postMeetingNotes) {
          await calendar.postMeetingNotes(standupEvent.id, text);
        }
      }
    }

    // Always post async to the standup channel as well
    if (messaging) {
      const standupChannel = (ctx.state.standupChannel as string) ?? "standup";
      await messaging.postMessage(standupChannel, text);
    }

    return {
      status: "done",
      summary: "Standup update posted",
    };
  },
};

// ─── Step: Parse actionables from meeting ────────────────────────────────────

const parseActionablesStep: WorkflowStep = {
  id: "parse_actionables",
  name: "Parse actionables from standup discussion",
  async run(ctx) {
    // In a live standup, the meeting transcript or Slack thread replies
    // may contain new items assigned to Joel.
    // This step processes those and creates tasks.
    const newActionables = (ctx.state.newActionables as string[]) ?? [];

    if (newActionables.length === 0) {
      return { status: "done", summary: "No new actionables from standup" };
    }

    const ticketing = ctx.integrations.get<import("../integrations/types.js").TicketingIntegration>("ticketing");
    const createdTickets: string[] = [];

    for (const action of newActionables) {
      if (ticketing) {
        const result = await ticketing.createTicket({
          projectId: "FRONTEND",
          title: action,
          description: `Actionable from standup on ${new Date().toISOString().split("T")[0]}.\n\nAssigned to Joel.`,
          assignee: "joel",
          priority: "normal",
        });
        if (result.externalRef) createdTickets.push(result.externalRef);
      }
    }

    const data = ctx.state.standupData as StandupData;
    data.actionablesTaken = newActionables;

    return {
      status: "done",
      summary: `Took ${newActionables.length} actionable(s) from standup${createdTickets.length ? `. Tickets: ${createdTickets.join(", ")}` : ""}`,
    };
  },
};

// ─── Workflow Assembly ────────────────────────────────────────────────────────

export const standupWorkflow: Workflow = {
  id: "standup",
  name: "Daily standup",

  matches(event: InboundEvent): boolean {
    return (
      event.type === "schedule.standup" ||
      event.type === "calendar.meeting_starting" ||
      (event.type === "slack.message" &&
        /standup|stand.?up|daily/i.test(event.rawText ?? ""))
    );
  },

  steps: [
    pullStandupDataStep,
    formatUpdateStep,
    postUpdateStep,
    parseActionablesStep,
  ],

  async run(ctx: WorkflowContext): Promise<WorkflowResult> {
    const completedSteps: string[] = [];

    for (const step of this.steps) {
      ctx.log(`[standup/${step.id}] Starting`);
      const result = await step.run(ctx);
      ctx.log(`[standup/${step.id}] ${result.status}: ${result.summary}`);
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
      summary: "Standup done",
      state: ctx.state,
    };
  },
};
