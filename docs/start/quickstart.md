---
title: Quickstart
summary: Get Bench running in minutes
---

Get Bench running locally in under 5 minutes.

## Quick Start (Recommended)

```sh
npx bench onboard --yes
```

This walks you through setup, configures your environment, and gets Bench running.

If you already have a Bench install, rerunning `onboard` keeps your current config and data paths intact. Use `bench configure` if you want to edit settings.

To start Bench again later:

```sh
npx bench run
```

> **Note:** If you used `npx` for setup, always use `npx bench` to run commands. The `pnpm bench` form only works inside a cloned copy of the Bench repository (see Local Development below).

## Local Development

For contributors working on Bench itself. Prerequisites: Node.js 20+ and pnpm 9+.

Clone the repository, then:

```sh
pnpm install
pnpm dev
```

This starts the API server and UI at [http://localhost:3100](http://localhost:3100).

No external database required — Bench uses an embedded PostgreSQL instance by default.

When working from the cloned repo, you can also use:

```sh
pnpm bench run
```

This auto-onboards if config is missing, runs health checks with auto-repair, and starts the server.

## What's Next

Once Bench is running:

1. Create your first company in the web UI
2. Define a company goal
3. Create an Admin coworker and configure its adapter
4. Build out the org chart with more agents
5. Set budgets and assign initial tasks
6. Hit go — agents start their heartbeats and the company runs

<Card title="Core Concepts" href="/start/core-concepts">
  Learn the key concepts behind Bench
</Card>
