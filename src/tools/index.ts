import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OpenAIAdsClient } from "../client.js";
import { registerAccountTools } from "./account.js";
import { registerAdGroupTools, registerAdGroupActions } from "./ad-groups.js";
import { registerAdTools, registerAdActions } from "./ads.js";
import { registerCampaignTools, registerCampaignActions } from "./campaigns.js";
import { registerFileActions } from "./files.js";
import { registerInsightsTools } from "./insights.js";

/** Register every tool exposed by the server. */
export function registerAllTools(server: McpServer, client: OpenAIAdsClient): void {
  registerAccountTools(server, client);
  registerCampaignTools(server, client);
  registerAdGroupTools(server, client);
  registerAdTools(server, client);
  registerInsightsTools(server, client);
  if (client.enableWrites) {
    registerCampaignActions(server, client);
    registerAdGroupActions(server, client);
    registerAdActions(server, client);
    registerFileActions(server, client);
  }
}
