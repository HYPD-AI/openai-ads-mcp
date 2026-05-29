import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OpenAIAdsClient } from "../client.js";
import { READ_ONLY_ANNOTATIONS, runTool } from "./result.js";

export function registerAccountTools(server: McpServer, client: OpenAIAdsClient): void {
  server.registerTool(
    "get_ad_account",
    {
      title: "Get ad account",
      description:
        "Fetch the ad account associated with the configured API key. Use this as a connectivity " +
        "check to confirm the key is valid, and to read account-level details such as name, " +
        "currency, status, and timezone. Each API key is scoped to a single ad account.",
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
    },
    () => runTool(() => client.get("/ad_account")),
  );
}
