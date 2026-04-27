import { App } from '@slack/bolt';
import { upsertMemory } from './memory/store.js';
import { buildResponse } from './engine/respond.js';
import { shouldRespond } from './engine/classify.js';
import { ingestAllSheets } from './tools/sheets.js';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
});

// Jordan's own Slack user ID - set after first run
let jordanUserId = null;

async function getJordanUserId() {
  if (jordanUserId) return jordanUserId;
  const auth = await app.client.auth.test();
  jordanUserId = auth.user_id;
  return jordanUserId;
}

// Ingest every message into memory
app.event('message', async ({ event, client }) => {
  const myId = await getJordanUserId();

  // Skip Jordan's own messages, bot messages, and edits
  if (event.bot_id || event.subtype || event.user === myId) return;

  const text = event.text?.trim();
  if (!text) return;

  // Store in memory
  await upsertMemory({
    id: `slack_${event.channel}_${event.ts}`,
    sourceType: 'slack_message',
    sourceRef: event.thread_ts || event.ts,
    contentText: text,
    author: event.user,
    timestamp: new Date(parseFloat(event.ts) * 1000).toISOString(),
    channelId: event.channel,
  });

  // Decide whether to respond proactively (skip if in a thread reply to avoid spam)
  if (event.thread_ts) return;

  const { shouldRespond: respond, confidence, reason } = await shouldRespond(text);
  console.log(`[classify] confidence=${confidence} respond=${respond} reason="${reason}"`);

  if (respond) {
    const reply = await buildResponse(text, { channelId: event.channel });
    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.ts,
      text: reply,
    });
  }
});

// Always respond when @mentioned
app.event('app_mention', async ({ event, client }) => {
  const text = event.text?.replace(/<@[A-Z0-9]+>/g, '').trim();

  const reply = await buildResponse(text, { channelId: event.channel });
  await client.chat.postMessage({
    channel: event.channel,
    thread_ts: event.ts,
    text: reply,
  });
});

(async () => {
  await app.start();
  console.log('Jordan is online');

  // Ingest sheets on startup
  await ingestAllSheets();

  // Re-ingest sheets every 6 hours
  setInterval(ingestAllSheets, 6 * 60 * 60 * 1000);
})();
