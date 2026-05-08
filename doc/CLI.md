# CLI Reference

Bench CLI now supports both:

- instance setup/diagnostics (`onboard`, `doctor`, `configure`, `env`, `allowed-hostname`, `env-lab`)
- control-plane client operations (issues, approvals, agents, activity, dashboard)

## Base Usage

Use repo script in development:

```sh
pnpm bench --help
```

First-time local bootstrap + run:

```sh
pnpm bench run
```

Choose local instance:

```sh
pnpm bench run --instance dev
```

## Deployment Modes

Mode taxonomy and design intent are documented in `doc/DEPLOYMENT-MODES.md`.

Current CLI behavior:

- `bench onboard` and `bench configure --section server` set deployment mode in config
- server onboarding/configure ask for reachability intent and write `server.bind`
- `bench run --bind <loopback|lan|tailnet>` passes a quickstart bind preset into first-run onboarding when config is missing
- runtime can override mode with `BENCH_DEPLOYMENT_MODE`
- `bench run` and `bench doctor` still do not expose a direct low-level `--mode` flag

Canonical behavior is documented in `doc/DEPLOYMENT-MODES.md`.

Allow an authenticated/private hostname (for example custom Tailscale DNS):

```sh
pnpm bench allowed-hostname dotta-macbook-pro
```

Bring up the default local SSH fixture for environment testing:

```sh
pnpm bench env-lab up
pnpm bench env-lab doctor
pnpm bench env-lab status --json
pnpm bench env-lab down
```

All client commands support:

- `--data-dir <path>`
- `--api-base <url>`
- `--api-key <token>`
- `--context <path>`
- `--profile <name>`
- `--json`

Company-scoped commands also support `--company-id <id>`.

Use `--data-dir` on any CLI command to isolate all default local state (config/context/db/logs/storage/secrets) away from `~/.bench`:

```sh
pnpm bench run --data-dir ./tmp/bench-dev
pnpm bench issue list --data-dir ./tmp/bench-dev
```

## Context Profiles

Store local defaults in `~/.bench/context.json`:

```sh
pnpm bench context set --api-base http://localhost:3100 --company-id <company-id>
pnpm bench context show
pnpm bench context list
pnpm bench context use default
```

To avoid storing secrets in context, set `apiKeyEnvVarName` and keep the key in env:

```sh
pnpm bench context set --api-key-env-var-name BENCH_API_KEY
export BENCH_API_KEY=...
```

## Company Commands

```sh
pnpm bench company list
pnpm bench company get <company-id>
pnpm bench company delete <company-id-or-prefix> --yes --confirm <same-id-or-prefix>
```

Examples:

```sh
pnpm bench company delete PAP --yes --confirm PAP
pnpm bench company delete 5cbe79ee-acb3-4597-896e-7662742593cd --yes --confirm 5cbe79ee-acb3-4597-896e-7662742593cd
```

Notes:

- Deletion is server-gated by `BENCH_ENABLE_COMPANY_DELETION`.
- With agent authentication, company deletion is company-scoped. Use the current company ID/prefix (for example via `--company-id` or `BENCH_COMPANY_ID`), not another company.

## Issue Commands

```sh
pnpm bench issue list --company-id <company-id> [--status todo,in_progress] [--assignee-agent-id <agent-id>] [--match text]
pnpm bench issue get <issue-id-or-identifier>
pnpm bench issue create --company-id <company-id> --title "..." [--description "..."] [--status todo] [--priority high]
pnpm bench issue update <issue-id> [--status in_progress] [--comment "..."]
pnpm bench issue comment <issue-id> --body "..." [--reopen]
pnpm bench issue checkout <issue-id> --agent-id <agent-id> [--expected-statuses todo,backlog,blocked]
pnpm bench issue release <issue-id>
```

## Agent Commands

```sh
pnpm bench agent list --company-id <company-id>
pnpm bench agent get <agent-id>
pnpm bench agent local-cli <agent-id-or-shortname> --company-id <company-id>
```

`agent local-cli` is the quickest way to run local Claude/Codex manually as a Bench agent:

- creates a new long-lived agent API key
- installs missing Bench skills into `~/.codex/skills` and `~/.claude/skills`
- prints `export ...` lines for `BENCH_API_URL`, `BENCH_COMPANY_ID`, `BENCH_AGENT_ID`, and `BENCH_API_KEY`

Example for shortname-based local setup:

```sh
pnpm bench agent local-cli codexcoder --company-id <company-id>
pnpm bench agent local-cli claudecoder --company-id <company-id>
```

## Approval Commands

```sh
pnpm bench approval list --company-id <company-id> [--status pending]
pnpm bench approval get <approval-id>
pnpm bench approval create --company-id <company-id> --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]
pnpm bench approval approve <approval-id> [--decision-note "..."]
pnpm bench approval reject <approval-id> [--decision-note "..."]
pnpm bench approval request-revision <approval-id> [--decision-note "..."]
pnpm bench approval resubmit <approval-id> [--payload '{"...":"..."}']
pnpm bench approval comment <approval-id> --body "..."
```

## Activity Commands

```sh
pnpm bench activity list --company-id <company-id> [--agent-id <agent-id>] [--entity-type issue] [--entity-id <id>]
```

## Dashboard Commands

```sh
pnpm bench dashboard get --company-id <company-id>
```

## Heartbeat Command

`heartbeat run` now also supports context/api-key options and uses the shared client stack:

```sh
pnpm bench heartbeat run --agent-id <agent-id> [--api-base http://localhost:3100] [--api-key <token>]
```

## Local Storage Defaults

Default local instance root is `~/.bench/instances/default`:

- config: `~/.bench/instances/default/config.json`
- embedded db: `~/.bench/instances/default/db`
- logs: `~/.bench/instances/default/logs`
- storage: `~/.bench/instances/default/data/storage`
- secrets key: `~/.bench/instances/default/secrets/master.key`

Override base home or instance with env vars:

```sh
BENCH_HOME=/custom/home BENCH_INSTANCE_ID=dev pnpm bench run
```

## Storage Configuration

Configure storage provider and settings:

```sh
pnpm bench configure --section storage
```

Supported providers:

- `local_disk` (default; local single-user installs)
- `s3` (S3-compatible object storage)
