/**
 * Slack connector.
 * Required env / config:
 *   SLACK_BOT_TOKEN   - xoxb-... token with channels:read, chat:write, files:write
 *   SLACK_SIGNING_SECRET - for verifying inbound events
 *
 * Joel's Slack presence:
 *   - He reads messages in channels he's in and in DMs
 *   - He replies in-thread by default (never spams the channel)
 *   - His handle is @joel (configurable)
 */

import type { MessagingIntegration, OperationResult, MessageOptions } from "../../types.js";

interface SlackSettings {
  botToken: string;
  signingSecret?: string;
  joelHandle?: string;
}

class SlackIntegration implements MessagingIntegration {
  id = "slack";
  private token: string;

  constructor(settings: SlackSettings) {
    this.token = settings.botToken;
  }

  async postMessage(channel: string, text: string, options?: MessageOptions): Promise<OperationResult> {
    const body: Record<string, unknown> = { channel, text };

    if (options?.attachments?.length) {
      body.attachments = options.attachments.map(a => ({
        title: a.title,
        text: a.text,
        title_link: a.url,
        image_url: a.imageUrl,
        color: a.color,
      }));
    }

    const response = await this.slackApi("chat.postMessage", body);
    return {
      success: response.ok,
      integrationId: this.id,
      operationId: "post_message",
      externalRef: response.ts,
      summary: response.ok ? `Posted to ${channel}` : `Failed: ${response.error}`,
      error: response.ok ? undefined : response.error,
    };
  }

  async postThreadReply(channel: string, threadId: string, text: string): Promise<OperationResult> {
    const response = await this.slackApi("chat.postMessage", {
      channel,
      thread_ts: threadId,
      text,
    });
    return {
      success: response.ok,
      integrationId: this.id,
      operationId: "post_thread_reply",
      externalRef: response.ts,
      summary: response.ok ? `Replied in thread ${threadId}` : `Failed: ${response.error}`,
      error: response.ok ? undefined : response.error,
    };
  }

  async postFileOrSnippet(channel: string, content: string, filename: string): Promise<OperationResult> {
    const response = await this.slackApi("files.uploadV2", {
      channel,
      content,
      filename,
    });
    return {
      success: response.ok,
      integrationId: this.id,
      operationId: "post_file",
      externalRef: response.file?.permalink,
      summary: response.ok ? `Uploaded ${filename}` : `Failed: ${response.error}`,
      error: response.ok ? undefined : response.error,
    };
  }

  private async slackApi(method: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await fetch(`https://slack.com/api/${method}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(body),
    });
    return res.json() as Promise<Record<string, unknown>>;
  }
}

export default function create(settings: Record<string, unknown>): SlackIntegration {
  if (!settings.botToken) throw new Error("Slack connector requires botToken");
  return new SlackIntegration(settings as unknown as SlackSettings);
}
