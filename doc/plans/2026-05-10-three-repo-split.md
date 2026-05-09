# Three-repo layout (get-bench org)

Date: 2026-05-10

Bench is split conceptually and in source layout into three GitHub repositories:

| Repository | Purpose |
|------------|---------|
| **[get-bench/bench](https://github.com/get-bench/bench)** | Product: Node API + React board UI, self-hosted on localhost or your infra (Paperclip-style “ship the app”). |
| **[get-bench/bench-landing](https://github.com/get-bench/bench-landing)** | Marketing / static landing only. No server, no app bundle. |
| **[get-bench/bench-macos](https://github.com/get-bench/bench-macos)** | **Bench for macOS** — Electron wrapper + `.app` / DMG / zip; builds a deploy bundle from a **`bench`** checkout via `BENCH_REPO_ROOT` or sibling `../bench`. |

## Local folder layout (recommended)

```text
Aashish Personal/
  bench/           ← this repo (core product only)
  bench-macos/     ← clone → get-bench/bench-macos
  bench-landing/   ← clone → get-bench/bench-landing
```

The **`bench-macos`** and **`bench-landing`** trees live next to **`bench`** on disk; they are **not** submodules of **`bench`**.

## Create the two new GitHub repos

In the org **get-bench**, create empty repos (no README/license if you will push an existing tree):

- `bench-landing`
- `bench-macos`

Then from your machine:

```bash
cd "/path/to/bench-landing"
git init
git add .
git commit -m "Initial bench-landing scaffold"
git branch -M main
git remote add origin https://github.com/get-bench/bench-landing.git
git push -u origin main
```

Repeat for **`bench-macos`** with `https://github.com/get-bench/bench-macos.git`.

## Core repo cleanup (`bench`)

The **`desktop/`** workspace package was removed from **`bench`**. macOS packaging lives only in **`bench-macos`**.

After pulling these changes, run **`pnpm install`** at the **`bench`** root so **`pnpm-lock.yaml`** drops the old **`desktop`** workspace entries.

## Next steps (later)

- Point **bench.ing** (or marketing domain) at **`bench-landing`** `dist/` deploy.
- Add CI on **`bench-macos`** that checks out **`bench`** and runs **`pnpm package:mac`** on release tags.
- Optional: submodule or pinned release artifact instead of always building from **`bench`** `main`.
