/**
 * Microsoft Teams connector.
 * Drop-in replacement for Slack in orgs that use the Microsoft stack.
 *
 * Required env / config:
 *   TEAMS_BOT_APP_ID      - Azure AD app registration ID
 *   TEAMS_BOT_APP_SECRET  - Azure AD app client secret
 *   TEAMS_TENANT_ID       - Azure AD tenant ID
 */

import type { MessagingIntegration, OperationResult, MessageOptions } from "../../types.js";

interface TeamsSettings {
  appId: string;
  appSecret: string;
  tenantId: string;
}

class TeamsIntegration implements MessagingIntegration {
  id = "teams";
  private appId: string;
  private appSecret: string;
  private tenantId: string;
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor(settings: TeamsSettings) {
    this.appId = settings.appId;
    this.appSecret = settings.appSecret;
    this.tenantId = settings.tenantId;
  }

  async postMessage(channel: string, text: string, _options?: MessageOptions): Promise<OperationResult> {
    const token = await this.getToken();
    // channel format: "teamId/channelId"
    const [teamId, channelId] = channel.split("/");
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ body: { contentType: "text", content: text } }),
      },
    );
    const data = await res.json() as Record<string, unknown>;
    return {
      success: !!data.id,
      integrationId: this.id,
      operationId: "post_message",
      externalRef: data.id as string,
      summary: data.id ? `Posted to ${channel}` : `Failed: ${JSON.stringify(data)}`,
    };
  }

  async postThreadReply(channel: string, threadId: string, text: string): Promise<OperationResult> {
    const token = await this.getToken();
    const [teamId, channelId] = channel.split("/");
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages/${threadId}/replies`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ body: { contentType: "text", content: text } }),
      },
    );
    const data = await res.json() as Record<string, unknown>;
    return {
      success: !!data.id,
      integrationId: this.id,
      operationId: "post_thread_reply",
      summary: data.id ? `Replied in thread` : `Failed: ${JSON.stringify(data)}`,
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

export default function create(settings: Record<string, unknown>): TeamsIntegration {
  if (!settings.appId || !settings.appSecret || !settings.tenantId) {
    throw new Error("Teams connector requires appId, appSecret, and tenantId");
  }
  return new TeamsIntegration(settings as unknown as TeamsSettings);
}
