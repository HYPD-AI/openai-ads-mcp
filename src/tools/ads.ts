import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { OpenAIAdsClient } from "../client.js";
import { listParamsShape } from "../schemas.js";
import { READ_ONLY_ANNOTATIONS, runTool } from "./result.js";
import { accountShape, adBody, createShape, resourceId } from "../action-schemas.js";
import { ACTION_ANNOTATIONS, APPROVAL_NOTE, createAndReadBack, verifyAccount } from "./actions.js";

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

export function registerAdActions(server: McpServer, client: OpenAIAdsClient): void {
  server.registerTool(
    "create_ad",
    {
      title: "Create a paused ad",
      description:
        APPROVAL_NOTE +
        "Create a paused chat_card ad, then read it back with review status and serving issues. Requires an approved destination and a file_id uploaded to this account (or read from an existing same-account ad). Title is 3–50 characters and body at most 100. Creating a paused ad still submits its creative for review; it is not a local draft. Product-feed templates are not supported.",
      inputSchema: { ...createShape, body: adBody },
      annotations: ACTION_ANNOTATIONS,
    },
    (args) =>
      runTool(async () => {
        await verifyAccount(client, args.expected_ad_account_id);
        const group = await client.get<{ product_set?: unknown }>(
          `/ad_groups/${encodeURIComponent(args.body.ad_group_id)}`,
        );
        if (group.product_set)
          throw new Error("Product-feed ad groups are not supported by this creation workflow.");
        return createAndReadBack(client, "/ads", args.body, args.idempotency_key);
      }),
  );
  server.registerTool(
    "preview_ad",
    {
      title: "Preview an existing ad",
      description:
        "Generate a temporary preview of an existing same-account ad. Requires actions enabled, but does not activate delivery. The preview expires after 24 hours and does not prove serving eligibility. This POST is not automatically retried.",
      inputSchema: { ...accountShape, ad_id: resourceId },
      annotations: ACTION_ANNOTATIONS,
    },
    (args) =>
      runTool(async () => {
        await verifyAccount(client, args.expected_ad_account_id);
        return client.post(`/ads/${encodeURIComponent(args.ad_id)}/preview`);
      }),
  );
}
