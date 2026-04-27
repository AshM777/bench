import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';
import { readSheet } from '../tools/sheets.js';

const anthropic = new AnthropicBedrock();

export async function buildSummarySheet(userRequest, spreadsheetId) {
  // Read up to 200 rows from each sheet for context
  const downloadsRaw = await readSheet(spreadsheetId, 'App Downloads!A1:J200');
  const onboardingRaw = await readSheet(spreadsheetId, 'User Onboarding!A1:M201');

  const downloadsPreview = downloadsRaw.slice(0, 30).map(r => r.join('\t')).join('\n');
  const onboardingPreview = onboardingRaw.slice(0, 30).map(r => r.join('\t')).join('\n');

  // Compute some basic stats to give Claude real numbers
  const dataRows = downloadsRaw.slice(1);
  const totalDownloads = dataRows.reduce((s, r) => s + (parseInt(r[1]) || 0), 0);
  const avgDaily = Math.round(totalDownloads / dataRows.length);
  const last7 = dataRows.slice(-7).reduce((s, r) => s + (parseInt(r[1]) || 0), 0);
  const prev7 = dataRows.slice(-14, -7).reduce((s, r) => s + (parseInt(r[1]) || 0), 0);
  const wow = prev7 ? (((last7 - prev7) / prev7) * 100).toFixed(1) : 'N/A';

  const onboardingRows = onboardingRaw.slice(1);
  const completed = onboardingRows.filter(r => r[10] === 'Yes').length;
  const completionRate = ((completed / onboardingRows.length) * 100).toFixed(1);
  const churned = onboardingRows.filter(r => r[12] === 'Yes').length;

  const prompt = `You are Jordan, a data analyst. The user asked: "${userRequest}"

Here is a preview of the App Downloads sheet (first 30 rows):
${downloadsPreview}

Here is a preview of the User Onboarding sheet (first 30 rows):
${onboardingPreview}

Key stats already computed:
- Total downloads (90 days): ${totalDownloads}
- Average daily downloads: ${avgDaily}
- Last 7 days vs prior 7 days: ${wow}% WoW change
- Onboarding completion rate: ${completionRate}% (${completed} of ${onboardingRows.length} users)
- Churned users: ${churned}

Generate a summary/dashboard sheet as a 2D array of rows. The first row should be headers.
Include sections for: Downloads Overview, Onboarding Funnel, Key Insights.
Use real numbers from the stats above. Keep it scannable - this will be pasted into a Google Sheet.
Make it genuinely useful, not generic.

Respond with JSON only in this format:
{
  "sheetName": "Summary Dashboard",
  "rows": [
    ["Header 1", "Header 2", ...],
    ["Value 1", "Value 2", ...],
    ...
  ]
}`;

  const response = await anthropic.messages.create({
    model: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0].text.trim();
  const json = raw.startsWith('```') ? raw.replace(/```json?\n?/g, '').replace(/```/g, '') : raw;
  return JSON.parse(json);
}
