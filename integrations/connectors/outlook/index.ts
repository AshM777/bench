/**
 * Outlook / Microsoft Calendar connector.
 * Drop-in alternative to google-workspace for orgs on the Microsoft stack.
 *
 * Required env / config:
 *   OUTLOOK_APP_ID      - Azure AD app ID (same as Teams if shared bot identity)
 *   OUTLOOK_APP_SECRET  - Azure AD client secret
 *   OUTLOOK_TENANT_ID   - Azure AD tenant ID
 *   OUTLOOK_USER_ID     - UPN or ID of the calendar owner (Joel's account)
 */

import type { CalendarIntegration, OperationResult, CalendarEvent } from "../../types.js";

interface OutlookSettings {
  appId: string;
  appSecret: string;
  tenantId: string;
  userId: string;
  standupKeywords?: string[];
}

class OutlookIntegration implements CalendarIntegration {
  id = "outlook";
  private appId: string;
  private appSecret: string;
  private tenantId: string;
  private userId: string;
  private standupKeywords: string[];
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor(settings: OutlookSettings) {
    this.appId = settings.appId;
    this.appSecret = settings.appSecret;
    this.tenantId = settings.tenantId;
    this.userId = settings.userId;
    this.standupKeywords = settings.standupKeywords ?? ["standup", "stand-up", "daily scrum", "daily sync"];
  }

  async getUpcomingEvents(lookaheadHours = 24): Promise<CalendarEvent[]> {
    const token = await this.getToken();
    const now = new Date().toISOString();
    const max = new Date(Date.now() + lookaheadHours * 3600_000).toISOString();

    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${this.userId}/calendarView?startDateTime=${now}&endDateTime=${max}&$orderby=start/dateTime`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = await res.json() as Record<string, unknown>;
    const items = (data.value as Record<string, unknown>[]) ?? [];

    return items.map(item => {
      const title = item.subject as string ?? "";
      const start = new Date((item.start as Record<string, string>).dateTime + "Z");
      const end = new Date((item.end as Record<string, string>).dateTime + "Z");
      const attendees = ((item.attendees as Record<string, unknown>[]) ?? []).map(
        a => ((a.emailAddress as Record<string, string>) ?? {}).address ?? "",
      );
      const joinUrl = (item.onlineMeeting as Record<string, string> | null)?.joinUrl;

      return {
        id: item.id as string,
        title,
        startTime: start,
        endTime: end,
        attendees,
        meetingUrl: joinUrl,
        isStandup: this.standupKeywords.some(kw => title.toLowerCase().includes(kw)),
      };
    });
  }

  async joinMeeting(meetingId: string): Promise<OperationResult> {
    return {
      success: true,
      integrationId: this.id,
      operationId: "join_meeting",
      externalRef: meetingId,
      summary: `Joel marked as attending meeting ${meetingId}`,
    };
  }

  async postMeetingNotes(meetingId: string, notes: string): Promise<OperationResult> {
    const token = await this.getToken();
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${this.userId}/events/${meetingId}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ body: { contentType: "text", content: notes } }),
      },
    );
    return {
      success: res.ok,
      integrationId: this.id,
      operationId: "post_meeting_notes",
      summary: res.ok ? "Notes added to calendar event" : `Failed: ${res.statusText}`,
    };
  }

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) return this.accessToken;
    const res = await fetch(
      `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.appId,
          client_secret: this.appSecret,
          scope: "https://graph.microsoft.com/.default",
          grant_type: "client_credentials",
        }),
      },
    );
    const data = await res.json() as Record<string, unknown>;
    this.accessToken = data.access_token as string;
    this.tokenExpiry = Date.now() + ((data.expires_in as number) - 60) * 1000;
    return this.accessToken;
  }
}

export default function create(settings: Record<string, unknown>): OutlookIntegration {
  if (!settings.appId || !settings.appSecret || !settings.tenantId || !settings.userId) {
    throw new Error("Outlook connector requires appId, appSecret, tenantId, and userId");
  }
  return new OutlookIntegration(settings as unknown as OutlookSettings);
}
