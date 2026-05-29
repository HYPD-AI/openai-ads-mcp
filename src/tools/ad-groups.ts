import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OpenAIAdsClient } from "../client.js";
import { MICROS_NOTE, paginationShape } from "../schemas.js";
import { READ_ONLY_ANNOTATIONS, runTool } from "./result.js";

export function registerAdGroupTools(server: McpServer, client: OpenAIAdsClient): void {
  server.registerTool(
    "list_ad_groups",
    {
      title: "List ad groups",
      description:
        "List ad groups in the ad account, optionally filtered to a single campaign. Ad groups " +
        "belong to a campaign and hold the bidding configuration and context hints. Supports " +
        "cursor pagination (`first_id`, `last_id`, `has_more`). " +
        MICROS_NOTE,
      inputSchema: {
        campaign_id: z
          .string()
          .optional()
          .describe("Optional. Only return ad groups belonging to this campaign ID."),
        ...paginationShape,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    (args) =>
      runTool(() =>
        client.get("/ad_groups", {
          campaign_id: args.campaign_id,
          limit: args.limit,
          order: args.order,
          after: args.after,
          before: args.before,
        }),
      ),
  );

  server.registerTool(
    "get_ad_group",
    {
      title: "Get ad group",
      description:
        "Fetch a single ad group by its ID, including its status, bidding configuration, and " +
        "context hints. " +
        MICROS_NOTE,
      inputSchema: {
        ad_group_id: z.string().min(1).describe("The ID of the ad group to fetch."),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    (args) => runTool(() => client.get(`/ad_groups/${encodeURIComponent(args.ad_group_id)}`)),
  );
}
