---
title: Docker
summary: Docker Compose quickstart
---

Run Bench in Docker without installing Node or pnpm locally.

## Compose Quickstart (Recommended)

```sh
docker compose -f docker/docker-compose.quickstart.yml up --build
```

Open [http://localhost:3100](http://localhost:3100).

Defaults:

- Host port: `3100`
- Data directory: `./data/docker-bench`

Override with environment variables:

```sh
BENCH_PORT=3200 BENCH_DATA_DIR=../data/pc \
  docker compose -f docker/docker-compose.quickstart.yml up --build
```

**Note:** `BENCH_DATA_DIR` is resolved relative to the compose file (`docker/`), so `../data/pc` maps to `data/pc` in the project root.

## Manual Docker Build

```sh
docker build -t bench-local .
docker run --name bench \
  -p 3100:3100 \
  -e HOST=0.0.0.0 \
  -e BENCH_HOME=/bench \
  -v "$(pwd)/data/docker-bench:/bench" \
  bench-local
```

## Data Persistence

All data is persisted under the bind mount (`./data/docker-bench`):

- Embedded PostgreSQL data
- Uploaded assets
- Local secrets key
- Agent workspace data

## Claude and Codex Adapters in Docker

The Docker image pre-installs:

- `claude` (Anthropic Claude Code CLI)
- `codex` (OpenAI Codex CLI)

Pass API keys to enable local adapter runs inside the container:

```sh
docker run --name bench \
  -p 3100:3100 \
  -e HOST=0.0.0.0 \
  -e BENCH_HOME=/bench \
  -e OPENAI_API_KEY=sk-... \
  -e ANTHROPIC_API_KEY=sk-... \
  -v "$(pwd)/data/docker-bench:/bench" \
  bench-local
```

Without API keys, the app runs normally — adapter environment checks will surface missing prerequisites.
