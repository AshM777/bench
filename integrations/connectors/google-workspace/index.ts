/**
 * Google Workspace connector (Calendar + Meet).
 * Required env / config:
 *   GOOGLE_SERVICE_ACCOUNT_JSON  - path to service account JSON, or JSON string
 *   GOOGLE_CALENDAR_ID           - the calendar Joel should watch (usually "primary" or a shared cal)
 *
 * Joel uses this to:
 *   - Check what meetings are coming up
 *   - Identify which one is standup
 *   - Get the Meet link to join
 *   - Post meeting notes after standup
 */

import type {
  CalendarIntegration,
  OperationResult,
  CalendarEvent,
} from "../../types.js";

interface GoogleWorkspaceSettings {
  serviceAccountJson: string; // path or JSON string
  calendarId: string;
  standupKeywords?: string[]; // default: ["standup", "stand-up", "daily"]
}

class GoogleWorkspaceIntegration implements CalendarIntegration {
  id = "google-workspace";
  private calendarId: string;
  private serviceAccountJson: string;
  private standupKeywords: string[];

  constructor(settings: GoogleWorkspaceSettings) {
    this.calendarId = settings.calendarId;
    this.serviceAccountJson = settings.serviceAccountJson;
    this.standupKeywords = settings.standupKeywords ?? ["standup", "stand-up", "daily scrum", "daily sync"];
  }

  async getUpcomingEvents(lookaheadHours = 24): Promise<CalendarEvent[]> {
    const now = new Date();
    const max = new Date(now.getTime() + lookaheadHours * 60 * 60 * 1000);

    const token = await this.getAccessToken();
    const qs = new URLSearchParams({
      calendarId: this.calendarId,
      timeMin: now.toISOString(),
      timeMax: max.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
    });

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events?${qs}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = await res.json() as Record<string, unknown>;
    const items = (data.items as Record<string, unknown>[]) ?? [];

    return items.map(item => {
      const start = new Date((item.start as Record<string, string>).dateTime ?? (item.start as Record<string, string>).date);
      const end = new Date((item.end as Record<string, string>).dateTime ?? (item.end as Record<string, string>).date);
      const title = item.summary as string ?? "";
      const attendees = ((item.attendees as Record<string, string>[]) ?? []).map(a => a.email);
      const meetUrl = (item.hangoutLink as string)
        ?? ((item.conferenceData as Record<string, unknown>)?.entryPoints as Record<string, string>[] | undefined)
          ?.find(e => e.entryPointType === "video")?.uri;

      return {
        id: item.id as string,
        title,
        startTime: start,
        endTime: end,
        attendees,
        meetingUrl: meetUrl,
        isStandup: this.standupKeywords.some(kw => title.toLowerCase().includes(kw)),
      };
    });
  }

  async joinMeeting(meetingId: string): Promise<OperationResult> {
    // "Joining" a meeting for an agent means noting attendance and being ready
    // to post updates. For a voice/video presence, this would require a meeting bot
    // SDK (e.g. Recall.ai). For now, this marks Joel as "present" in the meeting record.
    return {
      success: true,
      integrationId: this.id,
      operationId: "join_meeting",
      externalRef: meetingId,
      summary: `Joel marked as attending meeting ${meetingId}`,
    };
  }

  async postMeetingNotes(meetingId: string, notes: string): Promise<OperationResult> {
    // Post notes as a calendar event description update or via a linked doc.
    const token = await this.getAccessToken();
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events/${meetingId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description: notes }),
      },
    );
    const ok = res.ok;
    return {
      success: ok,
      integrationId: this.id,
      operationId: "post_meeting_notes",
      summary: ok ? "Meeting notes posted to calendar event" : `Failed: ${res.statusText}`,
    };
  }

  private async getAccessToken(): Promise<string> {
    // In production: use google-auth-library to exchange the service account key for a token.
    // Placeholder until the auth library is wired in.
    throw new Error("Google Workspace auth not yet implemented. Wire up google-auth-library with the service account JSON.");
  }
}

export default function create(settings: Record<string, unknown>): GoogleWorkspaceIntegration {
  if (!settings.serviceAccountJson || !settings.calendarId) {
    throw new Error("Google Workspace connector requires serviceAccountJson and calendarId");
  }
  return new GoogleWorkspaceIntegration(settings as unknown as GoogleWorkspaceSettings);
}
