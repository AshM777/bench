# Bench — Connector directory

This document is the **human-readable companion** to the canonical connector catalog in code:

- TypeScript source: `packages/shared/src/connectors/catalog.ts` (exported as `CONNECTOR_CATALOG` from `@bench/shared`).
- In-product browsing: **Company → Connectors** in the board UI (`/connectors`).

Connectors are **apps and systems** a coworker may use (Slack, email, GitHub, Jira, …). Steps describe a typical IT-safe rollout; specific OAuth apps and scopes will converge as each integration ships in Bench.

---

## How to use this directory

1. **Hiring / onboarding:** Pick connectors from the same categories as onboarding toolchain setup (chat, mail, repos, trackers, docs). See alignment note in [`coworkers.md`](./coworkers.md) (coworker = agent — no duplicate surfaces).
2. **Governance:** Review `typicalImportance` in code (`required` | `recommended` | `optional`) — shown as badges in the UI.
3. **Operations:** Follow `setupSteps` in the UI for each connector; keep vendor admin consoles and rotation policies in sync.

---

## Categories

| Category            | Intent                                      |
|---------------------|---------------------------------------------|
| Team chat           | Presence, DMs, channels, lightweight approvals |
| Email & calendar    | Mailbox triage, invites, scheduling         |
| Meetings            | Links, recordings policy, calendar coupling |
| Code & repositories | PRs, issues tied to repos, CI signals       |
| Work tracking       | Issues, boards, sprints                     |
| Docs & wiki         | Specs, runbooks, knowledge bases             |
| Cloud, data & platforms | Containers, cloud vendors, datastores, observability, CI/CD edges |
| Identity & access   | Directory context, SSO-adjacent (least use) |

---

## Listing

The authoritative list with **connection steps** lives in the **Connectors** page in the product and in `CONNECTOR_CATALOG` (IDs are stable; use them in docs and APIs).

Prominent entries include:

- **Chat:** Slack, Microsoft Teams, Google Chat, Mattermost, Webex Messaging  
- **Mail/cal:** Outlook / M365, Gmail & Google Calendar, generic IMAP/SMTP (escape hatch)  
- **Meetings:** Zoom, Google Meet, Teams meetings  
- **Code:** GitHub, GitLab, Bitbucket, Azure Repos  
- **Tracking:** Jira, Linear, Asana, Azure Boards, GitHub Issues  
- **Docs:** Confluence, Notion, Google Drive & Docs, SharePoint  
- **Cloud / data / platforms:** Docker, Kubernetes, major clouds (AWS, GCP, Azure resources), datastores (Postgres, Redis, …), observability (Datadog, Grafana, …), common SaaS APIs (Stripe, Twilio, …) — see `CONNECTOR_CATALOG` for the full list.  
- **Identity:** Okta, Entra ID, Auth0 (read/use only with strong justification)

---

## Maintenance

- When adding or renaming a connector, update **both** `catalog.ts` and this file’s high-level summary (if the category mix changes).
