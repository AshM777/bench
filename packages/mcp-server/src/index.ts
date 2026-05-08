import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BenchApiClient } from "./client.js";
import { readConfigFromEnv, type BenchMcpConfig } from "./config.js";
import { createToolDefinitions } from "./tools.js";

export function createBenchMcpServer(config: BenchMcpConfig = readConfigFromEnv()) {
  const server = new McpServer({
    name: "bench",
    version: "0.1.0",
  });

  const client = new BenchApiClient(config);
  const tools = createToolDefinitions(client);
  for (const tool of tools) {
    server.tool(tool.name, tool.description, tool.schema.shape, tool.execute);
  }

  return {
    server,
    tools,
    client,
  };
}

export async function runServer(config: BenchMcpConfig = readConfigFromEnv()) {
  const { server } = createBenchMcpServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
