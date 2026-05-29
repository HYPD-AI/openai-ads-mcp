import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OpenAIAdsClient } from "../client.js";
import { listParamsShape } from "../schemas.js";
import { READ_ONLY_ANNOTATIONS, runTool } from "./result.js";

export function registerAdTools(server: McpServer, client: OpenAIAdsClient): void {
  server.registerTool(
    "list_ads",
    {
      title: "List ads",
      description:
        "List ads within an ad group (`ad_group_id` is required). Each ad holds a creative " +
        "(title, body, target URL, image) and a `review_status` (in_review, approved, or " +
        "rejected). Supports cursor pagination (`order`, `after`/`before`; the response includes " +
        "`first_id`, `last_id`, and `has_more`).",
      inputSchema: {
        ad_group_id: z
          .string()
          .min(1)
          .describe("Parent ad group ID. Required — ads are listed within an ad group."),
        ...listParamsShape(500),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    (args) =>
      runTool(() =>
        client.get("/ads", {
          ad_group_id: args.ad_group_id,
          limit: args.limit,
          order: args.order,
          after: args.after,
          before: args.before,
        }),
      ),
  );

  server.registerTool(
    "get_ad",
    {
      title: "Get ad",
      description: "Fetch a single ad by its ID, including its creative and review status.",
      inputSchema: {
        ad_id: z.string().min(1).describe("The ID of the ad to fetch."),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    (args) => runTool(() => client.get(`/ads/${encodeURIComponent(args.ad_id)}`)),
  );
}
