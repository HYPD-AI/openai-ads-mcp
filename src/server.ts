import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OpenAIAdsClient } from "./client.js";
import type { Config } from "./config.js";
import { registerAllTools } from "./tools/index.js";
import { VERSION } from "./version.js";

/** Build an MCP server with every OpenAI Ads tool registered. */
export function buildServer(config: Config): McpServer {
  const server = new McpServer({
    name: "openai-ads-mcp",
    version: VERSION,
  });

  const client = new OpenAIAdsClient(config);
  registerAllTools(server, client);

  return server;
}
