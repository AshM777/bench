/**
 * Zoom connector.
 * Used for standup calls when the org runs standups on Zoom.
 *
 * Required env / config:
 *   ZOOM_ACCOUNT_ID    - Zoom Server-to-Server OAuth account ID
 *   ZOOM_CLIENT_ID     - Zoom OAuth client ID
 *   ZOOM_CLIENT_SECRET - Zoom OAuth client secret
 *   ZOOM_USER_ID       - Zoom user ID or email for Joel's account
 *
 * Note: for Joel to have a voice in a Zoom call, a meeting bot SDK
 * (e.g. Recall.ai) is required. This connector handles calendar/schedule
 * integration and joining - actual speaking/listening is out of scope here.
 */

import type { CalendarIntegration, OperationResult, CalendarEvent } from "../../types.js";

interface ZoomSettings {
  accountId: string;
  clientId: string;
  clientSecret: string;
  userId: string;
  standupKeywords?: string[];
}

class ZoomIntegration implements CalendarIntegration {
  id = "zoom";
  private accountId: string;
  private clientId: string;
  private clientSecret: string;
  private userId: string;
  private standupKeywords: string[];
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor(settings: ZoomSettings) {
    this.accountId = settings.accountId;
    this.clientId = settings.clientId;
    this.clientSecret = settings.clientSecret;
    this.userId = settings.userId;
    this.standupKeywords = settings.standupKeywords ?? ["standup", "stand-up", "daily"];
  }

  async getUpcomingEvents(lookaheadHours = 24): Promise<CalendarEvent[]> {
    const token = await this.getToken();
    const from = new Date().toISOString();
    const to = new Date(Date.now() + lookaheadHours * 3600_000).toISOString();

    const res = await fetch(
      `https://api.zoom.us/v2/users/${this.userId}/meetings?type=upcoming&from=${from}&to=${to}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = await res.json() as Record<string, unknown>;
    const meetings = (data.meetings as Record<string, unknown>[]) ?? [];

    return meetings.map(m => {
      const title = m.topic as string ?? "";
      const start = new Date(m.start_time as string);
      const durationMs = (m.duration as number) * 60_000;

      return {
        id: m.id as string,
        title,
        startTime: start,
        endTime: new Date(start.getTime() + durationMs),
        attendees: [],  // Zoom doesn't expose attendees pre-meeting via this endpoint
        meetingUrl: m.join_url as string,
        isStandup: this.standupKeywords.some(kw => title.toLowerCase().includes(kw)),
      };
    });
  }

  async joinMeeting(meetingId: string): Promise<OperationResult> {
    // Get the join URL and signal intent to join.
    // Actual audio/video requires a bot SDK - this records Joel's presence.
    const token = await this.getToken();
    const res = await fetch(`https://api.zoom.us/v2/meetings/${meetingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json() as Record<string, unknown>;
    return {
      success: res.ok,
      integrationId: this.id,
      operationId: "join_meeting",
      externalRef: data.join_url as string,
      summary: res.ok ? `Join URL: ${data.join_url}` : `Could not get meeting ${meetingId}`,
    };
  }

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) return this.accessToken;
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const res = await fetch("https://zoom.us/oauth/token?grant_type=account_credentials", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ account_id: this.accountId }),
    });
    const data = await res.json() as Record<string, unknown>;
    this.accessToken = data.access_token as string;
    this.tokenExpiry = Date.now() + ((data.expires_in as number) - 60) * 1000;
    return this.accessToken;
  }
}

export default function create(settings: Record<string, unknown>): ZoomIntegration {
  if (!settings.accountId || !settings.clientId || !settings.clientSecret || !settings.userId) {
    throw new Error("Zoom connector requires accountId, clientId, clientSecret, and userId");
  }
  return new ZoomIntegration(settings as unknown as ZoomSettings);
}
