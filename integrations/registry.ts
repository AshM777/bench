/**
 * Integration registry. Joel asks for "the ticketing system" or "the IDE" and gets
 * back whatever this org has configured. Swapping Jira for Linear, or Slack for Teams,
 * is a config change - not a code change.
 */

import type {
  IntegrationRegistry,
  IntegrationId,
  MessagingIntegration,
  VCSIntegration,
  TicketingIntegration,
  DeploymentIntegration,
  IDEIntegration,
  DesignIntegration,
  CalendarIntegration,
  OrgIntegrationConfig,
} from "./types.js";

type IntegrationCategory = keyof Omit<IntegrationRegistry, "get">;

export class Registry implements IntegrationRegistry {
  messaging: Record<string, MessagingIntegration> = {};
  vcs: Record<string, VCSIntegration> = {};
  ticketing: Record<string, TicketingIntegration> = {};
  deployment: Record<string, DeploymentIntegration> = {};
  ide: Record<string, IDEIntegration> = {};
  design: Record<string, DesignIntegration> = {};
  calendar: Record<string, CalendarIntegration> = {};

  private config: OrgIntegrationConfig;

  constructor(config: OrgIntegrationConfig) {
    this.config = config;
  }

  register(category: IntegrationCategory, integration: { id: IntegrationId }) {
    (this[category] as Record<string, unknown>)[integration.id] = integration;
    return this;
  }

  get<T>(category: IntegrationCategory, preferredId?: string): T | undefined {
    const bucket = this[category] as Record<string, T>;
    const id = preferredId
      ?? (this.config.preferences[category as keyof typeof this.config.preferences])
      ?? Object.keys(bucket)[0];
    return id ? bucket[id] : undefined;
  }

  /** Returns all integrations across all categories - useful for Joel to enumerate what's available. */
  listAll(): Array<{ category: IntegrationCategory; id: IntegrationId }> {
    const result: Array<{ category: IntegrationCategory; id: IntegrationId }> = [];
    const categories: IntegrationCategory[] = [
      "messaging", "vcs", "ticketing", "deployment", "ide", "design", "calendar",
    ];
    for (const category of categories) {
      for (const id of Object.keys(this[category])) {
        result.push({ category, id });
      }
    }
    return result;
  }
}

/** Minimal factory - build a registry from an org config and auto-load available connectors. */
export async function buildRegistry(config: OrgIntegrationConfig): Promise<Registry> {
  const registry = new Registry(config);

  for (const integrationId of config.activeIntegrations) {
    try {
      const connector = await loadConnector(integrationId, config.integrationSettings[integrationId] ?? {});
      if (connector) {
        registry.register(connector.category, connector.integration);
      }
    } catch (err) {
      // Missing connector is non-fatal - Joel will work with what's available
      // and file access requests for the rest.
      console.warn(`[registry] Could not load connector "${integrationId}":`, err);
    }
  }

  return registry;
}

interface ConnectorModule {
  category: IntegrationCategory;
  integration: { id: IntegrationId };
}

async function loadConnector(
  id: IntegrationId,
  settings: Record<string, unknown>,
): Promise<ConnectorModule | null> {
  const categoryMap: Record<string, IntegrationCategory> = {
    slack: "messaging",
    teams: "messaging",
    github: "vcs",
    gitlab: "vcs",
    bitbucket: "vcs",
    jira: "ticketing",
    linear: "ticketing",
    "github-issues": "ticketing",
    vercel: "deployment",
    netlify: "deployment",
    cursor: "ide",
    vscode: "ide",
    figma: "design",
    "google-workspace": "calendar",
    outlook: "calendar",
    zoom: "calendar",
  };

  const category = categoryMap[id];
  if (!category) return null;

  // Dynamic import from the connectors directory.
  // Each connector exports a default factory: (settings) => Integration
  const module = await import(`./connectors/${id}/index.js`).catch(() => null);
  if (!module) return null;

  const integration = module.default(settings);
  return { category, integration };
}
