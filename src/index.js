import { App } from '@slack/bolt';
import { upsertMemory } from './memory/store.js';
import { buildResponse } from './engine/respond.js';
import { shouldRespond } from './engine/classify.js';
import { ingestAllSheets, createSheet, writeSheet } from './tools/sheets.js';
import { buildSummarySheet } from './engine/summarise.js';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
});

let jordanUserId = null;

// Tracks thread timestamps where Jordan has posted - reply in these without needing a mention
const activeThreads = new Set();

async function getJordanUserId() {
  if (jordanUserId) return jordanUserId;
  const auth = await app.client.auth.test();
  jordanUserId = auth.user_id;
  return jordanUserId;
}

async function postReply(client, channel, threadTs, text) {
  await client.chat.postMessage({ channel, thread_ts: threadTs, text });
  activeThreads.add(`${channel}:${threadTs}`);
}

async function handleSheetRequest(text, event, client) {
  const spreadsheetId = process.env.SHEETS_CONFIG?.split(',')[0]?.split(':')[0];
  if (!spreadsheetId) return false;

  const lower = text.toLowerCase();
  const wantsSheet =
    lower.includes('summary') ||
    lower.includes('dashboard') ||
    lower.includes('pivot') ||
    lower.includes('create a sheet') ||
    lower.includes('new sheet') ||
    lower.includes('create a tab');

  if (!wantsSheet) return false;

  await postReply(client, event.channel, event.thread_ts || event.ts, 'On it. Building the summary sheet now, give me a moment.');

  try {
    const { sheetName, rows } = await buildSummarySheet(text, spreadsheetId);
    await createSheet(spreadsheetId, sheetName);
    await writeSheet(spreadsheetId, sheetName, rows);
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    await postReply(client, event.channel, event.thread_ts || event.ts, `Done. "${sheetName}" has been added to the spreadsheet: ${sheetUrl}`);
  } catch (err) {
    console.error('[sheet write error]', err);
    await postReply(client, event.channel, event.thread_ts || event.ts, `Hit an error writing the sheet: ${err.message}`);
  }
  return true;
}

// Handles all regular messages (non-mention) including DMs
app.event('message', async ({ event, client }) => {
  const myId = await getJordanUserId();
  if (event.bot_id || event.subtype || event.user === myId) return;

  const text = event.text?.trim();
  if (!text) return;

  const isDM = event.channel_type === 'im';

  // Always ingest into memory (skip DMs - they're private, not team context)
  if (!isDM) {
    await upsertMemory({
      id: `slack_${event.channel}_${event.ts}`,
      sourceType: 'slack_message',
      sourceRef: event.thread_ts || event.ts,
      contentText: text,
      author: event.user,
      timestamp: new Date(parseFloat(event.ts) * 1000).toISOString(),
      channelId: event.channel,
    });
  }

  // DMs: always respond directly, no classifier needed
  if (isDM) {
    const handled = await handleSheetRequest(text, event, client);
    if (!handled) {
      const reply = await buildResponse(text, { channelId: event.channel });
      await client.chat.postMessage({ channel: event.channel, text: reply });
    }
    return;
  }

  const threadKey = event.thread_ts ? `${event.channel}:${event.thread_ts}` : null;
  const isInJordanThread = threadKey && activeThreads.has(threadKey);

  // Build classifier context: include thread topic if this is a reply in a Jordan thread
  let classifyText = text;
  if (isInJordanThread && event.thread_ts) {
    try {
      const threadRes = await client.conversations.replies({
        channel: event.channel,
        ts: event.thread_ts,
        limit: 6,
      });
      const prior = (threadRes.messages || [])
        .filter(m => m.ts !== event.ts)
        .map(m => m.text)
        .join('\n');
      if (prior) classifyText = `Thread context:\n${prior}\n\nNew message: ${text}`;
    } catch { /* ingest only if fetch fails */ }
  }

  // Respond to top-level channel messages and threads Jordan is already in
  if (!event.thread_ts || isInJordanThread) {
    const { shouldRespond: respond, confidence, reason } = await shouldRespond(classifyText);
    console.log(`[classify] confidence=${confidence} respond=${respond} reason="${reason}"`);

    if (respond) {
      const handled = await handleSheetRequest(text, event, client);
      if (!handled) {
        const reply = await buildResponse(classifyText, { channelId: event.channel });
        await postReply(client, event.channel, event.thread_ts || event.ts, reply);
      }
    }
  }
});

// Always respond when @mentioned
app.event('app_mention', async ({ event, client }) => {
  const text = event.text?.replace(/<@[A-Z0-9]+>/g, '').trim();

  const handled = await handleSheetRequest(text, event, client);
  if (handled) return;

  const reply = await buildResponse(text, { channelId: event.channel });
  await postReply(client, event.channel, event.thread_ts || event.ts, reply);
});

(async () => {
  await app.start();
  console.log('Jordan is online');
  await ingestAllSheets();
  setInterval(ingestAllSheets, 6 * 60 * 60 * 1000);
})();
