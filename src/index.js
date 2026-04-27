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

async function getJordanUserId() {
  if (jordanUserId) return jordanUserId;
  const auth = await app.client.auth.test();
  jordanUserId = auth.user_id;
  return jordanUserId;
}

// Ingest every message into memory
app.event('message', async ({ event, client }) => {
  const myId = await getJordanUserId();
  if (event.bot_id || event.subtype || event.user === myId) return;

  const text = event.text?.trim();
  if (!text) return;

  await upsertMemory({
    id: `slack_${event.channel}_${event.ts}`,
    sourceType: 'slack_message',
    sourceRef: event.thread_ts || event.ts,
    contentText: text,
    author: event.user,
    timestamp: new Date(parseFloat(event.ts) * 1000).toISOString(),
    channelId: event.channel,
  });

  if (event.thread_ts) return;

  const { shouldRespond: respond, confidence, reason } = await shouldRespond(text);
  console.log(`[classify] confidence=${confidence} respond=${respond} reason="${reason}"`);

  if (respond) {
    const reply = await buildResponse(text, { channelId: event.channel });
    await client.chat.postMessage({ channel: event.channel, thread_ts: event.ts, text: reply });
  }
});

// Always respond when @mentioned
app.event('app_mention', async ({ event, client }) => {
  const text = event.text?.replace(/<@[A-Z0-9]+>/g, '').trim();
  const lowerText = text.toLowerCase();

  // Handle "create a summary/dashboard/pivot" requests
  const wantsSheet =
    lowerText.includes('summary') ||
    lowerText.includes('dashboard') ||
    lowerText.includes('pivot') ||
    lowerText.includes('create a sheet') ||
    lowerText.includes('new sheet') ||
    lowerText.includes('create a tab');

  const spreadsheetId = process.env.SHEETS_CONFIG?.split(',')[0]?.split(':')[0];

  if (wantsSheet && spreadsheetId) {
    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.ts,
      text: 'On it. Building the summary sheet now, give me a moment.',
    });

    try {
      const { sheetName, rows } = await buildSummarySheet(text, spreadsheetId);
      await createSheet(spreadsheetId, sheetName);
      await writeSheet(spreadsheetId, sheetName, rows);

      const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.ts,
        text: `Done. "${sheetName}" has been added to the spreadsheet: ${sheetUrl}`,
      });
    } catch (err) {
      console.error('[sheet write error]', err);
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.ts,
        text: `Hit an error writing the sheet: ${err.message}`,
      });
    }
    return;
  }

  const reply = await buildResponse(text, { channelId: event.channel });
  await client.chat.postMessage({ channel: event.channel, thread_ts: event.ts, text: reply });
});

(async () => {
  await app.start();
  console.log('Jordan is online');
  await ingestAllSheets();
  setInterval(ingestAllSheets, 6 * 60 * 60 * 1000);
})();
