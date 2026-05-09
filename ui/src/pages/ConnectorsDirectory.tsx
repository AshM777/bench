import { useEffect, useMemo, useState } from "react";
import { useLocation } from "@/lib/router";
import {
  CONNECTOR_CATEGORY_LABELS,
  CONNECTOR_CATEGORY_ORDER,
  CONNECTOR_CATALOG,
  groupedConnectors,
  type ConnectorCategory,
  type ConnectorDefinition,
  type ConnectorTypicalImportance,
} from "@bench/shared";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { cn } from "../lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Cable, Search, BookOpen, Package } from "lucide-react";
import StackIcon, { type IconName } from "tech-stack-icons";
import { useTheme } from "../context/ThemeContext";

function importanceLabel(v: ConnectorTypicalImportance): string {
  if (v === "required") return "Typically required";
  if (v === "recommended") return "Recommended";
  return "Optional";
}

function importanceClass(v: ConnectorTypicalImportance): string {
  if (v === "required") return "bg-amber-500/15 text-amber-900 dark:text-amber-100 border-amber-500/30";
  if (v === "recommended") return "bg-blue-500/10 text-blue-900 dark:text-blue-100 border-blue-500/25";
  return "bg-muted text-muted-foreground border-border";
}

function ConnectorBrandIcon({
  stackIcon,
  className,
}: {
  stackIcon?: string;
  className?: string;
}) {
  const { theme } = useTheme();
  if (!stackIcon) {
    return <Package className={cn("text-muted-foreground", className)} aria-hidden />;
  }
  return (
    <StackIcon
      name={stackIcon as IconName}
      variant={theme === "dark" ? "dark" : "light"}
      className={className}
    />
  );
}

function ConnectorGuideSheet({
  connector,
  open,
  onOpenChange,
}: {
  connector: ConnectorDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!connector) return null;
  const auth =
    connector.authenticationNotes?.length ? (
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Authentication & access
        </p>
        <ul className="text-sm text-foreground list-disc pl-4 space-y-2">
          {connector.authenticationNotes.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">
        Authentication is usually OAuth or scoped API tokens owned by IT. Follow the numbered steps below and your
        vendor&apos;s admin console; enforce least privilege on every scope.
      </p>
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-start gap-3 pr-8">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40">
              <ConnectorBrandIcon stackIcon={connector.stackIcon} className="h-7 w-7 shrink-0" />
            </span>
            <span className="leading-snug">{connector.name}</span>
          </SheetTitle>
          <SheetDescription>{connector.description}</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6">
          {connector.prerequisites?.length ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Before you start
              </p>
              <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                {connector.prerequisites.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>{auth}</div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Integration checklist
            </p>
            <ol className="text-sm text-foreground list-decimal pl-4 space-y-2">
              {connector.setupSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
          {connector.learnMoreUrl ? (
            <p className="text-sm">
              <a
                href={connector.learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                Vendor documentation
              </a>
            </p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ConnectorRow({
  connector,
  onOpenGuide,
}: {
  connector: ConnectorDefinition;
  onOpenGuide: (c: ConnectorDefinition) => void;
}) {
  const anchor = `connector-${connector.id}`;
  const categoryLabel = CONNECTOR_CATEGORY_LABELS[connector.category];
  return (
    <div
      id={anchor}
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-border last:border-b-0 scroll-mt-28"
    >
      <div className="flex gap-3 min-w-0 flex-1">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40"
          aria-hidden
        >
          <ConnectorBrandIcon stackIcon={connector.stackIcon} className="h-7 w-7 shrink-0" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{connector.name}</span>
            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-border bg-muted/60 text-muted-foreground font-medium">
              {categoryLabel}
            </span>
            <span
              className={cn(
                "text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border font-medium",
                importanceClass(connector.typicalImportance),
              )}
            >
              {importanceLabel(connector.typicalImportance)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{connector.description}</p>
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" className="shrink-0 sm:self-center" onClick={() => onOpenGuide(connector)}>
        <BookOpen className="h-3.5 w-3.5 mr-1.5" />
        Setup guide
      </Button>
    </div>
  );
}

export function ConnectorsDirectory() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const location = useLocation();
  const [q, setQ] = useState("");
  const [guideConnector, setGuideConnector] = useState<ConnectorDefinition | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setBreadcrumbs([{ label: "Connectors" }]);
  }, [setBreadcrumbs]);

  const grouped = useMemo(() => groupedConnectors(), []);

  const filteredByCategory = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filterConn = (c: ConnectorDefinition) => {
      if (!needle) return true;
      const catLabel = CONNECTOR_CATEGORY_LABELS[c.category].toLowerCase();
      return (
        c.name.toLowerCase().includes(needle) ||
        c.description.toLowerCase().includes(needle) ||
        c.id.toLowerCase().includes(needle) ||
        catLabel.includes(needle)
      );
    };
    const next = new Map<ConnectorCategory, ConnectorDefinition[]>();
    for (const cat of CONNECTOR_CATEGORY_ORDER) {
      next.set(cat, (grouped.get(cat) ?? []).filter(filterConn));
    }
    return next;
  }, [grouped, q]);

  useEffect(() => {
    const raw = location.hash.replace(/^#/, "");
    if (!raw) return;
    const el = document.getElementById(raw);
    if (el) {
      requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [location.hash]);

  function openGuide(c: ConnectorDefinition) {
    setGuideConnector(c);
    setSheetOpen(true);
  }

  const navCounts = useMemo(() => {
    return CONNECTOR_CATEGORY_ORDER.map((cat) => ({
      cat,
      count: filteredByCategory.get(cat)?.length ?? 0,
    })).filter((x) => x.count > 0);
  }, [filteredByCategory]);

  return (
    <div className="mx-auto max-w-6xl flex flex-col lg:flex-row gap-8 lg:gap-10 px-4 md:px-6 py-6 pb-16">
      <aside className="lg:w-52 shrink-0 lg:sticky lg:top-4 lg:self-start space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Cable className="h-5 w-5 shrink-0" />
            <h1 className="text-lg font-semibold text-foreground">Connectors</h1>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Reference integrations coworkers use. IT usually wires OAuth centrally; managers confirm scopes and channel
            membership for their team.
          </p>
        </div>
        <nav className="hidden lg:flex flex-col gap-1 text-sm border border-border rounded-lg p-2 bg-card">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">Jump to category</span>
          {navCounts.map(({ cat, count }) => (
            <a
              key={cat}
              href={`#cat-${cat}`}
              className="rounded-md px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              {CONNECTOR_CATEGORY_LABELS[cat]}
              <span className="text-xs tabular-nums ml-1 opacity-70">({count})</span>
            </a>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 space-y-6">
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">After central IT connects an app</p>
          <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
            <li>
              <span className="text-foreground font-medium">Manager:</span> confirm the coworker is invited to the right
              Slack channels / shared drives / repos (least privilege).
            </li>
            <li>
              Open the coworker&apos;s <strong>Instructions</strong> tab and add team norms, ticket prefixes, and
              escalation rules.
            </li>
            <li>
              Run a short <strong>test task</strong> (issue or routine) and watch <strong>Activity</strong> for auth or
              scope errors.
            </li>
          </ul>
        </div>

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search connectors…"
            className="pl-9"
            aria-label="Search connectors"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {CONNECTOR_CATALOG.length} connectors · Use <strong>Setup guide</strong> for prerequisites, authentication
          notes, and the full checklist.
        </p>

        <div className="flex flex-col gap-8">
          {CONNECTOR_CATEGORY_ORDER.map((cat) => {
            const list = filteredByCategory.get(cat) ?? [];
            if (!list.length) return null;
            return (
              <section key={cat} id={`cat-${cat}`} className="scroll-mt-24 space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {CONNECTOR_CATEGORY_LABELS[cat]}
                </h2>
                <div className="rounded-lg border border-border bg-card overflow-hidden">{list.map((c) => (
                  <ConnectorRow key={c.id} connector={c} onOpenGuide={openGuide} />
                ))}</div>
              </section>
            );
          })}
          {q.trim() &&
          CONNECTOR_CATEGORY_ORDER.every((cat) => (filteredByCategory.get(cat) ?? []).length === 0) ? (
            <p className="text-sm text-muted-foreground">No connectors match &ldquo;{q.trim()}&rdquo;.</p>
          ) : null}
        </div>
      </div>

      <ConnectorGuideSheet
        connector={guideConnector}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setGuideConnector(null);
        }}
      />
    </div>
  );
}
