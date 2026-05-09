# Bench — “Coworker” vs agent

In **customer-facing Bench language**, a hired AI worker is a **coworker** (`doc/vision.md`). Under the hood this is still the same **agent** entity and runtime as PaperClip: one row in `agents`, same APIs under `/api/.../agents/...`, same skills and connector plumbing.

**Do not maintain a parallel “coworkers” product surface** (duplicate lists, separate detail routes, or second archetype systems). Extend **Agent** detail and existing onboarding.

- **Unified activity feed:** `GET /api/companies/:companyId/agents/:agentId/activity` — merges activity log + recent runs; surfaced on the agent **Dashboard** tab in the UI.
- **Connector catalog:** `CONNECTOR_CATALOG` in `@bench/shared` and **`/connectors`** in the UI — reference list for Slack, mail, trackers, etc., aligned with onboarding toolchain categories.

Role presets for onboarding include a fixed **Admin** template for the founding coworker (`agents.role = admin`) plus hireable roles from `HIRABLE_COWORKER_ROLES` in `@bench/shared`; `role` / `title` stay the data model.
