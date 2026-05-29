import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OpenAIAdsClient, QueryParams } from "../client.js";
import { insightsShape, MICROS_NOTE } from "../schemas.js";
import { READ_ONLY_ANNOTATIONS, runTool } from "./result.js";

interface InsightsArgs {
  since?: string;
  until?: string;
  time_granularity?: string;
  fields?: string[];
}

function insightsQuery(args: InsightsArgs): QueryParams {
  return {
    since: args.since,
    until: args.until,
    time_granularity: args.time_granularity,
    fields: args.fields,
  };
}

const METRICS_NOTE =
  "Returns delivery metrics such as impressions, clicks, spend, ctr, cpc, and cpm over the " +
  "requested window, broken out at the chosen granularity. " +
  MICROS_NOTE;

export function registerInsightsTools(server: McpServer, client: OpenAIAdsClient): void {
  server.registerTool(
    "get_account_insights",
    {
      title: "Get ad account insights",
      description:
        "Retrieve aggregated performance insights for the entire ad account. " + METRICS_NOTE,
      inputSchema: { ...insightsShape },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    (args) => runTool(() => client.get("/ad_account/insights", insightsQuery(args))),
  );

  server.registerTool(
    "get_campaign_insights",
    {
      title: "Get campaign insights",
      description: "Retrieve performance insights for a single campaign. " + METRICS_NOTE,
      inputSchema: {
        campaign_id: z.string().min(1).describe("The ID of the campaign to report on."),
        ...insightsShape,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    (args) =>
      runTool(() =>
        client.get(
          `/campaigns/${encodeURIComponent(args.campaign_id)}/insights`,
          insightsQuery(args),
        ),
      ),
  );

  server.registerTool(
    "get_ad_group_insights",
    {
      title: "Get ad group insights",
      description: "Retrieve performance insights for a single ad group. " + METRICS_NOTE,
      inputSchema: {
        ad_group_id: z.string().min(1).describe("The ID of the ad group to report on."),
        ...insightsShape,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    (args) =>
      runTool(() =>
        client.get(
          `/ad_groups/${encodeURIComponent(args.ad_group_id)}/insights`,
          insightsQuery(args),
        ),
      ),
  );

  server.registerTool(
    "get_ad_insights",
    {
      title: "Get ad insights",
      description: "Retrieve performance insights for a single ad. " + METRICS_NOTE,
      inputSchema: {
        ad_id: z.string().min(1).describe("The ID of the ad to report on."),
        ...insightsShape,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    (args) =>
      runTool(() =>
        client.get(`/ads/${encodeURIComponent(args.ad_id)}/insights`, insightsQuery(args)),
      ),
  );
}
