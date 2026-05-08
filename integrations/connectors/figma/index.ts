/**
 * Figma connector.
 * Required env / config:
 *   FIGMA_ACCESS_TOKEN  - Figma personal access token
 *
 * Joel uses Figma read-only: he pulls design specs and assets before
 * implementing UI changes. He never modifies designs.
 */

import type {
  DesignIntegration,
  DesignSpec,
  DesignComponent,
} from "../../types.js";

interface FigmaSettings {
  accessToken: string;
}

class FigmaIntegration implements DesignIntegration {
  id = "figma";
  private token: string;

  constructor(settings: FigmaSettings) {
    this.token = settings.accessToken;
  }

  async getDesign(fileId: string, nodeId?: string): Promise<DesignSpec> {
    const path = nodeId
      ? `files/${fileId}/nodes?ids=${encodeURIComponent(nodeId)}`
      : `files/${fileId}`;

    const data = await this.figmaApi(path);

    const name = (data.name as string) ?? "Untitled";
    const thumbnailUrl = data.thumbnailUrl as string | undefined;

    const components: DesignComponent[] = Object.entries(
      (data.components as Record<string, unknown>) ?? {},
    ).map(([id, c]) => {
      const comp = c as Record<string, string>;
      return {
        id,
        name: comp.name ?? id,
        description: comp.description,
      };
    });

    return { id: fileId, name, thumbnailUrl, components };
  }

  async exportAsset(fileId: string, nodeId: string, format: "png" | "svg" | "pdf"): Promise<string> {
    const data = await this.figmaApi(
      `images/${fileId}?ids=${encodeURIComponent(nodeId)}&format=${format}&scale=2`,
    );
    const images = (data.images as Record<string, string>) ?? {};
    const url = images[nodeId];
    if (!url) throw new Error(`No export URL for node ${nodeId} in file ${fileId}`);
    return url;
  }

  private async figmaApi(path: string): Promise<Record<string, unknown>> {
    const res = await fetch(`https://api.figma.com/v1/${path}`, {
      headers: { "X-Figma-Token": this.token },
    });
    return res.json() as Promise<Record<string, unknown>>;
  }
}

export default function create(settings: Record<string, unknown>): FigmaIntegration {
  if (!settings.accessToken) throw new Error("Figma connector requires accessToken");
  return new FigmaIntegration(settings as unknown as FigmaSettings);
}
