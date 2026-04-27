import { google } from 'googleapis';
import { upsertMemory } from '../memory/store.js';

function getAuth() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

export async function readSheet(spreadsheetId, range = '') {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: range || 'A1:Z1000',
  });
  return res.data.values || [];
}

export async function ingestSheet(spreadsheetId, sheetName) {
  const rows = await readSheet(spreadsheetId);
  if (!rows.length) return;

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Chunk into batches of 20 rows to keep embeddings meaningful
  const chunkSize = 20;
  for (let i = 0; i < dataRows.length; i += chunkSize) {
    const chunk = dataRows.slice(i, i + chunkSize);
    const text = [
      `Sheet: ${sheetName}`,
      `Columns: ${headers.join(', ')}`,
      ...chunk.map(row => row.join(' | ')),
    ].join('\n');

    await upsertMemory({
      id: `sheet_${spreadsheetId}_${i}`,
      sourceType: 'google_sheet',
      sourceRef: spreadsheetId,
      contentText: text,
      author: 'sheets',
      timestamp: new Date().toISOString(),
      channelId: null,
    });
  }

  console.log(`Ingested ${dataRows.length} rows from "${sheetName}"`);
}

export async function createSheet(spreadsheetId, title) {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() });
  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }],
    },
  });
  return res.data.replies[0].addSheet.properties.sheetId;
}

export async function writeSheet(spreadsheetId, sheetName, rows) {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });
}

export async function listSheetNames(spreadsheetId) {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() });
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  return res.data.sheets.map(s => s.properties.title);
}

// SHEETS_CONFIG format: "spreadsheetId:Sheet Name,spreadsheetId2:Sheet Name 2"
export async function ingestAllSheets() {
  const config = process.env.SHEETS_CONFIG;
  if (!config) return;

  for (const entry of config.split(',')) {
    const [spreadsheetId, sheetName] = entry.split(':');
    await ingestSheet(spreadsheetId.trim(), sheetName?.trim() || spreadsheetId);
  }
}
