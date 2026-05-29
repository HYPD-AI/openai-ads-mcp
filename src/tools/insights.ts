import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OpenAIAdsClient, QueryParams } from "../client.js";
import { insightsShape } from "../schemas.js";
import { READ_ONLY_ANNOTATIONS, runTool } from "./result.js";

interface InsightsArgs {
  since?: string;
  until?: string;
  time_granularity?: "daily" | "none";
  aggregation_level?: "ad_account" | "campaign" | "ad_group" | "ad";
  fields?: string[];
  sort?: { field: string; direction?: "asc" | "desc" }[];
  filters?: string[];
  limit?: number;
  after?: string;
  before?: string;
}

/**
 * Translate the friendly insights arguments into the API's query parameters.
 *
 * Array parameters use the API's `name[]` convention, and `since`/`until` are
 * folded into a single `time_ranges[]` date_range expression.
 */
export function insightsQuery(args: InsightsArgs): QueryParams {
  const query: QueryParams = {
    time_granularity: args.time_granularity,
    aggregation_level: args.aggregation_level,
    limit: args.limit,
    after: args.after,
    before: args.before,
  };

  if (args.since !== undefined || args.until !== undefined) {
    query["time_ranges[]"] = [
      JSON.stringify({ type: "date_range", since: args.since, until: args.until }),
    ];
  }
  if (args.fields && args.fields.length > 0) {
    query["fields[]"] = args.fields;
  }
  if (args.sort && args.sort.length > 0) {
    query["sort[]"] = args.sort.map((expr) => JSON.stringify(expr));
  }
  if (args.filters && args.filters.length > 0) {
    query["filters[]"] = args.filters;
  }

  return query;
}

const METRICS_NOTE =
  "Returns a list response (`data[]` with `first_id`/`last_id`/`has_more` for paging). Each row " +
  "carries `id`, `start_time`, `end_time`, plus the projected `fields` such as impressions, " +
  "clicks, spend, ctr, cpc, cpm, readable_time, campaign_name, ad_group_name, and ad_name. " +
  "Combine `aggregation_level`, `sort`, and `limit` to rank entities (e.g. the top ad by clicks). " +
  "Monetary metrics (spend, cpc, cpm) are in the account's currency as decimal values, not micros.";

export function registerInsightsTools(server: McpServer, client: OpenAIAdsClient): void {
  server.registerTool(
    "get_account_insights",
    {
      title: "Get ad account insights",
      description:
        "Retrieve performance insights aggregated across the entire ad account. " + METRICS_NOTE,
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
