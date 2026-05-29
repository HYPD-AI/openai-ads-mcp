import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OpenAIAdsClient } from "../client.js";
import { MICROS_NOTE, paginationShape } from "../schemas.js";
import { READ_ONLY_ANNOTATIONS, runTool } from "./result.js";

export function registerCampaignTools(server: McpServer, client: OpenAIAdsClient): void {
  server.registerTool(
    "list_campaigns",
    {
      title: "List campaigns",
      description:
        "List campaigns in the ad account. Campaigns are the top-level objects that define the " +
        "objective, budget, and country targeting. Supports cursor pagination; the response " +
        "includes `first_id`, `last_id`, and `has_more`. " +
        MICROS_NOTE,
      inputSchema: { ...paginationShape },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    (args) =>
      runTool(() =>
        client.get("/campaigns", {
          limit: args.limit,
          order: args.order,
          after: args.after,
          before: args.before,
        }),
      ),
  );

  server.registerTool(
    "get_campaign",
    {
      title: "Get campaign",
      description:
        "Fetch a single campaign by its ID, including its objective, status, budget, and " +
        "targeting. " +
        MICROS_NOTE,
      inputSchema: {
        campaign_id: z.string().min(1).describe("The ID of the campaign to fetch."),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    (args) => runTool(() => client.get(`/campaigns/${encodeURIComponent(args.campaign_id)}`)),
  );
}
