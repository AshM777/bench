import fs from "node:fs";
import path from "node:path";

type ViteWatcherEvent = "add" | "change" | "unlink";

export interface ViteWatcherHost {
  watcher?: {
    on?: (event: ViteWatcherEvent, listener: (file: string) => void) => unknown;
    off?: (event: ViteWatcherEvent, listener: (file: string) => void) => unknown;
  };
}

export interface CachedViteHtmlRenderer {
  render(_url: string): Promise<string>;
  dispose(): void;
}

const WATCHER_EVENTS: ViteWatcherEvent[] = ["add", "change", "unlink"];
const MAIN_ENTRY_TAG = '<script type="module" src="/src/main.tsx"></script>';
const VITE_CLIENT_TAG = '<script type="module" src="/@vite/client"></script>';
const REACT_REFRESH_PREAMBLE = `<script type="module">
import { injectIntoGlobalHook } from "/@react-refresh";
injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
</script>`;
const DEV_SW_RESET_PREAMBLE = `<script>
(() => {
  // Dev-only safety net: stale service workers can keep serving old bundles
  // after large refactors/renames and produce blank screens.
  const marker = "bench.dev.sw-reset.v1";
  if (!("serviceWorker" in navigator)) return;
  if (sessionStorage.getItem(marker) === "done") return;
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    if (registrations.length === 0) {
      sessionStorage.setItem(marker, "done");
      return;
    }
    Promise.all(registrations.map((registration) => registration.unregister()))
      .catch(() => undefined)
      .finally(() => {
        sessionStorage.setItem(marker, "done");
        location.reload();
      });
  }).catch(() => undefined);
})();
</script>`;

function injectViteDevPreamble(html: string): string {
  let injectedHtml = html;
  if (!injectedHtml.includes("bench.dev.sw-reset.v1")) {
    injectedHtml = injectedHtml.includes("</head>")
      ? injectedHtml.replace("</head>", `    ${DEV_SW_RESET_PREAMBLE}\n  </head>`)
      : `${DEV_SW_RESET_PREAMBLE}\n${injectedHtml}`;
  }
  if (!injectedHtml.includes('"/@react-refresh"') && !injectedHtml.includes("'/@react-refresh'")) {
    injectedHtml = injectedHtml.includes("</head>")
      ? injectedHtml.replace("</head>", `    ${REACT_REFRESH_PREAMBLE}\n  </head>`)
      : `${REACT_REFRESH_PREAMBLE}\n${injectedHtml}`;
  }
  if (injectedHtml.includes(VITE_CLIENT_TAG)) return injectedHtml;
  if (injectedHtml.includes(MAIN_ENTRY_TAG)) {
    return injectedHtml.replace(MAIN_ENTRY_TAG, `${VITE_CLIENT_TAG}\n    ${MAIN_ENTRY_TAG}`);
  }
  return injectedHtml.replace("</body>", `    ${VITE_CLIENT_TAG}\n  </body>`);
}

export function createCachedViteHtmlRenderer(opts: {
  vite: ViteWatcherHost;
  uiRoot: string;
  brandHtml?: (html: string) => string;
}): CachedViteHtmlRenderer {
  const uiRoot = path.resolve(opts.uiRoot);
  const templatePath = path.resolve(uiRoot, "index.html");
  const brandHtml = opts.brandHtml ?? ((html: string) => html);
  let cachedHtml: string | null = null;

  function loadHtml(): string {
    if (cachedHtml === null) {
      const rawTemplate = fs.readFileSync(templatePath, "utf-8");
      cachedHtml = injectViteDevPreamble(brandHtml(rawTemplate));
    }
    return cachedHtml;
  }

  function invalidate(): void {
    cachedHtml = null;
  }

  function onWatchEvent(filePath: string): void {
    const resolvedPath = path.resolve(filePath);
    if (resolvedPath === templatePath) {
      invalidate();
    }
  }

  for (const eventName of WATCHER_EVENTS) {
    opts.vite.watcher?.on?.(eventName, onWatchEvent);
  }

  return {
    render(): Promise<string> {
      return Promise.resolve(loadHtml());
    },

    dispose(): void {
      for (const eventName of WATCHER_EVENTS) {
        opts.vite.watcher?.off?.(eventName, onWatchEvent);
      }
    },
  };
}
