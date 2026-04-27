/**
 * Creates a Google Sheet with realistic onboarding + app download data for the Jordan demo.
 * Run once: node --env-file=.env scripts/create-seed-data.js
 *
 * Creates a spreadsheet with three sheets:
 *   1. App Downloads  - 90 days of daily download data by platform and country
 *   2. User Onboarding - per-user funnel steps with completion and drop-off
 *   3. Summary Dashboard - Jordan will generate this on request
 */

import { google } from 'googleapis';

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

function dateStr(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Simulate a realistic download trend:
// - Baseline ~200/day
// - Week 6 ago: spike from a press mention (+60%)
// - Week 2 ago: dip after bad App Store review (-25%)
// - Last 5 days: recovery
function downloadCount(daysAgo) {
  let base = 200;
  if (daysAgo >= 38 && daysAgo <= 44) base = 320; // press spike
  if (daysAgo >= 10 && daysAgo <= 16) base = 150; // rating dip
  if (daysAgo <= 4) base = 185; // recovery
  return rand(base - 20, base + 20);
}

function buildDownloadsSheet() {
  const header = ['Date', 'Total Downloads', 'iOS', 'Android', 'Web', 'US', 'UK', 'India', 'Others', 'App Store Rating'];
  const rows = [header];

  for (let d = 89; d >= 0; d--) {
    const total = downloadCount(d);
    const ios = Math.floor(total * 0.52);
    const android = Math.floor(total * 0.38);
    const web = total - ios - android;
    const us = Math.floor(total * 0.45);
    const uk = Math.floor(total * 0.12);
    const india = Math.floor(total * 0.18);
    const others = total - us - uk - india;

    // Rating dip: drops from 4.4 to 3.8 starting 14 days ago, recovers slowly
    let rating = 4.4;
    if (d <= 16 && d >= 10) rating = 3.8;
    else if (d < 10 && d >= 5) rating = 3.9;
    else if (d < 5) rating = 4.1;

    rows.push([dateStr(d), total, ios, android, web, us, uk, india, others, rating]);
  }
  return rows;
}

function buildOnboardingSheet() {
  const header = [
    'User ID', 'Signup Date', 'Platform', 'Country', 'Plan',
    'Step 1: Account Created', 'Step 2: Profile Complete', 'Step 3: First Feature Used',
    'Step 4: Invited Teammate', 'Step 5: Connected Integration', 'Completed Onboarding',
    'Days to Complete', 'Churned'
  ];
  const rows = [header];

  const platforms = ['iOS', 'Android', 'Web'];
  const countries = ['US', 'US', 'US', 'UK', 'India', 'Canada', 'Germany'];
  const plans = ['Free', 'Free', 'Free', 'Pro', 'Team'];

  for (let i = 1; i <= 500; i++) {
    const daysAgo = rand(1, 89);
    const platform = platforms[rand(0, 2)];
    const country = countries[rand(0, 6)];
    const plan = plans[rand(0, 4)];

    const s1 = 'Yes';
    const s2 = Math.random() > 0.12 ? 'Yes' : 'No';
    const s3 = s2 === 'Yes' && Math.random() > 0.22 ? 'Yes' : 'No';
    const s4 = s3 === 'Yes' && Math.random() > 0.48 ? 'Yes' : 'No';
    const s5 = s4 === 'Yes' && Math.random() > 0.38 ? 'Yes' : 'No';
    const completed = s5 === 'Yes' ? 'Yes' : 'No';
    const daysToComplete = completed === 'Yes' ? rand(1, 14) : '';
    const churned = completed === 'No' && Math.random() > 0.6 ? 'Yes' : 'No';

    rows.push([
      `USR-${String(i).padStart(4, '0')}`,
      dateStr(daysAgo),
      platform,
      country,
      plan,
      s1, s2, s3, s4, s5,
      completed,
      daysToComplete,
      churned
    ]);
  }
  return rows;
}

async function main() {
  console.log('Creating spreadsheet...');

  const file = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: 'Bench Demo - Jordan Seed Data' },
      sheets: [
        { properties: { title: 'App Downloads' } },
        { properties: { title: 'User Onboarding' } },
      ],
    },
  });

  const spreadsheetId = file.data.spreadsheetId;
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  console.log(`Spreadsheet created: ${url}`);

  console.log('Writing App Downloads...');
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'App Downloads!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: buildDownloadsSheet() },
  });

  console.log('Writing User Onboarding...');
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'User Onboarding!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: buildOnboardingSheet() },
  });

  console.log('\nDone.');
  console.log(`Spreadsheet ID: ${spreadsheetId}`);
  console.log(`\nAdd this to your .env SHEETS_CONFIG:`);
  console.log(`SHEETS_CONFIG=${spreadsheetId}:App Downloads,${spreadsheetId}:User Onboarding`);
  console.log(`\nOpen it here: ${url}`);
}

main().catch(console.error);
