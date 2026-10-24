import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OpenAIAdsClient } from "../client.js";
import { MICROS_NOTE, listParamsShape } from "../schemas.js";
import { READ_ONLY_ANNOTATIONS, runTool } from "./result.js";
import { adGroupBody, createShape } from "../action-schemas.js";
import { ACTION_ANNOTATIONS, APPROVAL_NOTE, createAndReadBack, verifyAccount } from "./actions.js";

export function registerAdGroupTools(server: McpServer, client: OpenAIAdsClient): void {
  server.registerTool(
    "list_ad_groups",
    {
      title: "List ad groups",
      description:
        "List ad groups within a campaign (`campaign_id` is required). Ad groups belong to a " +
        "campaign and hold the bidding configuration and context hints. Supports cursor " +
        "pagination (`order`, `after`/`before`; the response includes `first_id`, `last_id`, and " +
        "`has_more`). " +
        MICROS_NOTE,
      inputSchema: {
        campaign_id: z
          .string()
          .min(1)
          .describe("Parent campaign ID. Required — ad groups are listed within a campaign."),
        ...listParamsShape(500),
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

export function registerAdGroupActions(server: McpServer, client: OpenAIAdsClient): void {
  server.registerTool(
    "create_ad_group",
    {
      title: "Create a paused ad group",
      description:
        APPROVAL_NOTE +
        "Create a paused ad group in a verified standard campaign. Uses fixed_bid, maximize_clicks, or maximize_conversions. Context hints describe relevant needs, not keyword match types or targeting guarantees. Manual clicks bids are CPC; impressions bids are per-impression micros (CPM times 1000); conversions bids are CPA even though billing is per click. Parent billing and strategy compatibility are checked. " +
        MICROS_NOTE,
      inputSchema: { ...createShape, body: adGroupBody },
      annotations: ACTION_ANNOTATIONS,
    },
    (args) =>
      runTool(async () => {
        await verifyAccount(client, args.expected_ad_account_id);
        const parent = await client.get<{
          bidding_type?: string;
          billing_event_type?: string;
          mode?: string | null;
        }>(`/campaigns/${encodeURIComponent(args.body.campaign_id)}`);
        if (parent.mode === "product_feed")
          throw new Error("Product-feed campaigns are not supported by this creation workflow.");
        const type = parent.bidding_type;
        if (!type || !["clicks", "impressions", "conversions"].includes(type))
          throw new Error("Cannot verify the parent campaign objective.");
        const expectedBilling =
          parent.billing_event_type ?? (type === "impressions" ? "impression" : "click");
        const bid = args.body.bidding_config;
        if (
          bid.billing_event_type !== expectedBilling ||
          (bid.strategy === "maximize_clicks" && type !== "clicks") ||
          (bid.strategy === "maximize_conversions" && type !== "conversions")
        ) {
          throw new Error("Bidding strategy or billing event does not match the parent campaign.");
        }
        return createAndReadBack(client, "/ad_groups", args.body, args.idempotency_key);
      }),
  );
}
