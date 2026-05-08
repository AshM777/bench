---
title: Setup Commands
summary: Onboard, run, doctor, and configure
---

Instance setup and diagnostics commands.

## `bench run`

One-command bootstrap and start:

```sh
pnpm bench run
```

Does:

1. Auto-onboards if config is missing
2. Runs `bench doctor` with repair enabled
3. Starts the server when checks pass

Choose a specific instance:

```sh
pnpm bench run --instance dev
```

## `bench onboard`

Interactive first-time setup:

```sh
pnpm bench onboard
```

If Bench is already configured, rerunning `onboard` keeps the existing config in place. Use `bench configure` to change settings on an existing install.

First prompt:

1. `Quickstart` (recommended): local defaults (embedded database, no LLM provider, local disk storage, default secrets)
2. `Advanced setup`: full interactive configuration

Start immediately after onboarding:

```sh
pnpm bench onboard --run
```

Non-interactive defaults + immediate start (opens browser on server listen):

```sh
pnpm bench onboard --yes
```

On an existing install, `--yes` now preserves the current config and just starts Bench with that setup.

## `bench doctor`

Health checks with optional auto-repair:

```sh
pnpm bench doctor
pnpm bench doctor --repair
```

Validates:

- Server configuration
- Database connectivity
- Secrets adapter configuration
- Storage configuration
- Missing key files

## `bench configure`

Update configuration sections:

```sh
pnpm bench configure --section server
pnpm bench configure --section secrets
pnpm bench configure --section storage
```

## `bench env`

Show resolved environment configuration:

```sh
pnpm bench env
```

This now includes bind-oriented deployment settings such as `BENCH_BIND` and `BENCH_BIND_HOST` when configured.

## `bench allowed-hostname`

Allow a private hostname for authenticated/private mode:

```sh
pnpm bench allowed-hostname my-tailscale-host
```

## Local Storage Paths

| Data | Default Path |
|------|-------------|
| Config | `~/.bench/instances/default/config.json` |
| Database | `~/.bench/instances/default/db` |
| Logs | `~/.bench/instances/default/logs` |
| Storage | `~/.bench/instances/default/data/storage` |
| Secrets key | `~/.bench/instances/default/secrets/master.key` |

Override with:

```sh
BENCH_HOME=/custom/home BENCH_INSTANCE_ID=dev pnpm bench run
```

Or pass `--data-dir` directly on any command:

```sh
pnpm bench run --data-dir ./tmp/bench-dev
pnpm bench doctor --data-dir ./tmp/bench-dev
```
