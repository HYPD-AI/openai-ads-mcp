import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OpenAIAdsClient } from "../client.js";
import { MICROS_NOTE, listParamsShape } from "../schemas.js";
import { READ_ONLY_ANNOTATIONS, runTool } from "./result.js";
import { campaignBody, createShape } from "../action-schemas.js";
import { ACTION_ANNOTATIONS, APPROVAL_NOTE, createAndReadBack, verifyAccount } from "./actions.js";

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
      inputSchema: { ...listParamsShape(500) },
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

export function registerCampaignActions(server: McpServer, client: OpenAIAdsClient): void {
  server.registerTool(
    "create_campaign",
    {
      title: "Create a paused campaign",
      description:
        APPROVAL_NOTE +
        "Create a standard (non-feed) campaign and read it back with serving issues. status defaults to paused; active is rejected. Specify clicks (CPC), impressions (CPM), or conversions (oCPC, billed per click). Conversions need one active standard event setting from this account; account/source eligibility is ultimately enforced by the API. Geography must be mapped explicitly; omitted targeting is unrestricted. " +
        MICROS_NOTE,
      inputSchema: { ...createShape, body: campaignBody },
      annotations: ACTION_ANNOTATIONS,
    },
    (args) =>
      runTool(async () => {
        await verifyAccount(client, args.expected_ad_account_id);
        const eventId = args.body.conversion_event_setting_ids?.[0];
        if (eventId) {
          let after: string | undefined;
          const seen = new Set<string>();
          let found = false;
          do {
            const page = await client.get<{
              data: { id: string; event_type: string; archived: boolean; source_ids: string[] }[];
              has_more?: boolean;
              last_id?: string;
            }>("/conversions/event_settings", { limit: 500, after });
            const setting = page.data.find((v) => v.id === eventId);
            if (setting) {
              if (
                setting.archived !== false ||
                !setting.event_type ||
                setting.event_type === "custom" ||
                setting.source_ids?.length !== 1
              ) {
                throw new Error(
                  "Conversion goal must be an active standard setting linked to one source.",
                );
              }
              found = true;
              break;
            }
            if (!page.has_more) break;
            if (!page.last_id || seen.has(page.last_id))
              throw new Error(
                "Conversion setting pagination did not advance; no campaign was created.",
              );
            seen.add(page.last_id);
            after = page.last_id;
          } while (after);
          if (!found)
            throw new Error("Conversion event setting was not found in the approved account.");
        }
        return createAndReadBack(client, "/campaigns", args.body, args.idempotency_key);
      }),
  );
}
