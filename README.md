# Bench

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Hire AI agents like team members.**

Bench is a marketplace of pre-built AI agents that join your Slack, connect to your tools, build memory over time, and participate proactively — without you needing to configure or prompt them.

The first agent is **Jordan**, a data analyst who reads your Google Sheets and Slack history, answers data questions, and flags when decisions don't match the data.

---

## What Jordan does

- Joins your Slack workspace like a team member — add Jordan to any channel
- Reads your Google Sheets and indexes them into memory on startup
- Responds when @mentioned with specific, sourced answers
- Posts proactively when a data decision is being made without context
- Builds memory over time — every message and sheet chunk is embedded and retrievable

---

## The demo

> PM posts in #growth: "DAU is down 12% this week, pretty sure it's the new onboarding change."
>
> Jordan (unprompted, 15 seconds later): "Worth checking before we anchor on that — the drop started Tuesday, two days before the onboarding change shipped. It lines up closer with the App Store rating dip (3.8 to 3.2) on Monday evening. Here's the DAU vs. rating overlay for the last 30 days: [Sheets link]."
>
> PM: "Wait, really? Can you pull the cohort breakdown?"
>
> Jordan: "New users that week dropped 18%, existing user retention held flat at 94%..."

Jordan was never asked to watch the channel. Jordan was just there.

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- A Slack app (see setup below)
- AWS Bedrock access with Claude models enabled and Amazon Titan Embed V2 enabled (`us-east-1` recommended)

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/AshM777/bench.git
cd bench
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env` with your credentials. See the comments in `.env.example` for where to get each value.

### 3. Set up Supabase

In your Supabase project, open the **SQL Editor** and run the contents of `supabase-setup.sql`. This creates the `memory_items` table and the vector similarity search function.

### 4. Run Jordan

```bash
npm run dev
```

Jordan will start, connect to Slack via Socket Mode, and ingest your configured Google Sheets. Add Jordan to a channel and say hello.

---

## Slack app setup

Create a new app at [api.slack.com/apps](https://api.slack.com/apps).

**OAuth scopes (Bot Token):**
```
channels:history
channels:read
chat:write
im:write
users:read
groups:history
```

**Event subscriptions — subscribe to:**
```
message.channels
app_mention
message.im
```

**Enable Socket Mode** — generate an App-Level Token with `connections:write` scope. This is your `SLACK_APP_TOKEN`.

Copy the Bot Token (`xoxb-`), App Token (`xapp-`), and Signing Secret into `.env`.

---

## Google Sheets setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) and create a project
2. Enable the **Google Sheets API** and **Google Drive API**
3. Create an **OAuth 2.0 Client ID** (Desktop app type)
4. Use the client ID and secret to generate a refresh token with `drive.readonly` scope
5. Add the spreadsheet IDs and sheet names to `SHEETS_CONFIG` in `.env`:

```
SHEETS_CONFIG=spreadsheetId1:DAU Tracker,spreadsheetId2:Release Log,spreadsheetId3:App Store Ratings
```

---

## Architecture

```
Slack events
    |
    v
index.js (Slack Bolt, Socket Mode)
    |
    +-- message event --> embed + store in Supabase
    |                 --> classify.js (Haiku via Bedrock) --> post proactively if confident
    |
    +-- app_mention  --> respond.js (Sonnet via Bedrock)
                              |
                              +-- searchMemory() --> Supabase pgvector
                              +-- build prompt with retrieved context
                              +-- return response to Slack

Google Sheets
    |
    v
tools/sheets.js --> chunk rows --> embed --> store in Supabase
(runs on startup + every 6 hours)
```

---

## Project structure

```
bench/
  src/
    agents/jordan.js      - Jordan's system prompt and classification prompt
    engine/respond.js     - builds responses using retrieved memory + Claude Sonnet
    engine/classify.js    - Haiku decides if Jordan should post proactively
    memory/embed.js       - OpenAI text-embedding-3-small
    memory/store.js       - upsert and semantic search via Supabase pgvector
    tools/sheets.js       - crawl and ingest Google Sheets
    index.js              - Slack Bolt app, event handlers, startup
  supabase-setup.sql      - run once in Supabase SQL editor
  .env.example            - all required environment variables
```

---

## License

MIT — see [LICENSE](LICENSE).

Built with [Slack Bolt](https://github.com/slackapi/bolt-js), [Anthropic Claude + Amazon Titan Embed via AWS Bedrock](https://docs.anthropic.com/en/api/claude-on-amazon-bedrock), [Supabase pgvector](https://supabase.com/docs/guides/ai/vector-columns), and [Google Sheets API](https://developers.google.com/sheets/api).
