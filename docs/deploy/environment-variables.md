---
title: Environment Variables
summary: Full environment variable reference
---

All environment variables that Bench uses for server configuration.

## Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3100` | Server port |
| `BENCH_BIND` | `loopback` | Reachability preset: `loopback`, `lan`, `tailnet`, or `custom` |
| `BENCH_BIND_HOST` | (unset) | Required when `BENCH_BIND=custom` |
| `HOST` | `127.0.0.1` | Legacy host override; prefer `BENCH_BIND` for new setups |
| `DATABASE_URL` | (embedded) | PostgreSQL connection string |
| `BENCH_HOME` | `~/.bench` | Base directory for all Bench data |
| `BENCH_INSTANCE_ID` | `default` | Instance identifier (for multiple local instances) |
| `BENCH_DEPLOYMENT_MODE` | `local_trusted` | Runtime mode override |
| `BENCH_DEPLOYMENT_EXPOSURE` | `private` | Exposure policy when deployment mode is `authenticated` |
| `BENCH_API_URL` | (auto-derived) | Bench API base URL. When set externally (e.g., via Kubernetes ConfigMap, load balancer, or reverse proxy), the server preserves the value instead of deriving it from the listen host and port. Useful for deployments where the public-facing URL differs from the local bind address. |

## Secrets

| Variable | Default | Description |
|----------|---------|-------------|
| `BENCH_SECRETS_MASTER_KEY` | (from file) | 32-byte encryption key (base64/hex/raw) |
| `BENCH_SECRETS_MASTER_KEY_FILE` | `~/.bench/.../secrets/master.key` | Path to key file |
| `BENCH_SECRETS_STRICT_MODE` | `false` | Require secret refs for sensitive env vars |

## Agent Runtime (Injected into agent processes)

These are set automatically by the server when invoking agents:

| Variable | Description |
|----------|-------------|
| `BENCH_AGENT_ID` | Agent's unique ID |
| `BENCH_COMPANY_ID` | Company ID |
| `BENCH_API_URL` | Bench API base URL (inherits the server-level value; see Server Configuration above) |
| `BENCH_API_KEY` | Short-lived JWT for API auth |
| `BENCH_RUN_ID` | Current heartbeat run ID |
| `BENCH_TASK_ID` | Issue that triggered this wake |
| `BENCH_WAKE_REASON` | Wake trigger reason |
| `BENCH_WAKE_COMMENT_ID` | Comment that triggered this wake |
| `BENCH_APPROVAL_ID` | Resolved approval ID |
| `BENCH_APPROVAL_STATUS` | Approval decision |
| `BENCH_LINKED_ISSUE_IDS` | Comma-separated linked issue IDs |

## LLM Provider Keys (for adapters)

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key (for Claude Local adapter) |
| `OPENAI_API_KEY` | OpenAI API key (for Codex Local adapter) |
