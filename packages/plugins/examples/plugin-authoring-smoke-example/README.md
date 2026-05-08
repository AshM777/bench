# Plugin Authoring Smoke Example

A Bench plugin

## Development

```bash
pnpm install
pnpm dev            # watch builds
pnpm dev:ui         # local dev server with hot-reload events
pnpm test
```

## Install Into Bench

```bash
pnpm bench plugin install ./
```

## Build Options

- `pnpm build` uses esbuild presets from `@bench/plugin-sdk/bundlers`.
- `pnpm build:rollup` uses rollup presets from the same SDK.
