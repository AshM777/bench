# Roadmap from product vision → engineering next steps

Date: 2026-05-10

**Source:** [`doc/vision.md`](../vision.md) (v0.1 — May 2026).

**Constraint:** Do **not** change the three-step onboarding (`ui/src/components/OnboardingWizard.tsx` and supporting launch helpers). Treat onboarding as frozen unless vision explicitly revises it.

---

## Alignment with current codebase

| Vision concept | Today (approx.) | Gap |
|----------------|-----------------|-----|
| Coworker | Agents in DB + UI (`agents`, board flows) | Dedicated “coworker” overview, profile shell, activity semantics |
| Connected apps | Tool picks in onboarding; integrations under `integrations/connectors/` | Persisted connector health UI, per-coworker connector strip |
| Activity feed | Issue/run/transcript surfaces | Unified cross-tool **coworker activity** model + API |
| Slack coworker | `integrations/connectors/slack/index.ts` exists | Bot identity (name/avatar), DM/channel behavior wired to runtime |

---

## Phase 1 — Coworker dashboard (single company, one coworker)

**Goal:** After onboarding, a manager opens Bench and sees **one clear coworker home**: identity, connected apps (even if mocked from onboarding selections first), and a **minimal activity timeline**.

### UI

1. **No duplicate “Coworkers” route:** Bench UX calls hires coworkers; data model remains PaperClip **agents**. Use existing **Agents** list + **`/agents/:id`** (dashboard tab). Prefer copy/clarity tweaks later over parallel navigation.
2. **List view:** already `Agents` page — optional labels/tooltips only.
3. **Detail view:** extend agent **Dashboard** tab: connector directory link + unified activity (log + runs); other tabs stay as today (instructions, skills, configuration, runs, budget).
4. **Home / Overview** (scoped): counts + last activity rows — can ship after dashboard loop is solid.

### API / data

1. Define **activity event** shape (timestamp, coworker id, source app, action type, summary, metadata) — start read-only from existing tables (runs, issue comments) before inventing new collectors.
2. Company-scoped routes only; no cross-org yet.

### Exit criteria

- Demo path: complete onboarding → land on coworker detail → see connectors row + non-empty activity from at least one existing signal (e.g. last run).

---

## Phase 2 — Slack connector + identity

**Goal:** Coworker appears as a **named Slack app/user**; responds in DM; can post/read in allowed channels per policy.

### Workstreams

1. **OAuth + tokens:** Align Slack connector with company + coworker binding; store tokens with least privilege scopes (vision: scope minimization).
2. **Bot presentation:** App name + avatar from coworker identity (map from agent profile / onboarding).
3. **Event loop:** Incoming messages → routing to execution layer (reuse adapter/runtime paths); outbound replies attributed to coworker.
4. **Dashboard:** Connector row shows Slack connected / last sync / errors.

### Exit criteria

- Recorded demo: DM coworker in Slack → action visible in Phase 1 activity feed.

---

## Phase 3 — Multi-org + RBAC

**Goal:** **Bench Admin** vs **Team Manager** views per vision; managers see only assigned coworkers.

### Workstreams

1. **Roles:** `admin`, `manager`, `viewer` (names TBD in `packages/shared` + session claims).
2. **Assignments:** Coworker ↔ team/org membership; manager scoped queries on all coworker/activity APIs.
3. **UI:** Gate routes; Admin-only org list and global connector health when introduced.

### Exit criteria

- Two test users: admin sees all coworkers in instance; manager sees subset only.

---

## Deferred (after core loop)

Ordered loosely by vision “Enterprise-Readiness”:

- BYOK, SSO (SAML/OIDC), exportable audit API
- Billing per seat
- Full connector catalog page + re-auth flows
- SOC 2 / retention / PII policy automation

---

## Contract check

Large behavior changes should still respect **`doc/SPEC-implementation.md`** (V1 contract). Where vision and spec conflict, **raise explicitly** in PR/issue before expanding scope.

---

## Immediate next actions (this week)

1. Spec **activity event** MVP + one API (`GET …/companies/:companyId/agents/:agentId/activity`) backed by existing domain events.
2. Surface that feed on the agent **Dashboard** tab + link **`/connectors`** from the same view (no separate coworkers routes).
3. Spike **Slack identity** mapping from agent record → Slack app manifest/bot user (doc outcome before large code).
