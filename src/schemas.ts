import { z } from "zod";

/**
 * Monetary amounts in the OpenAI Ads API are expressed in "micros". This note is
 * appended to tool descriptions so models can present human-readable currency.
 */
export const MICROS_NOTE =
  "Monetary values are expressed in micros: 1,000,000 micros = 1 unit of the account's currency " +
  "(for example, $1.00 = 1,000,000 micros). Divide any *_micros value by 1,000,000 to show a " +
  "human-readable amount, and multiply by 1,000,000 to convert a currency amount into micros.";

/**
 * Cursor-pagination parameters shared by list endpoints. `maxLimit` bounds the
 * `limit` field because each endpoint caps it differently (e.g. ads allow 500).
 */
export function listParamsShape(maxLimit: number) {
  return {
    limit: z
      .number()
      .int()
      .min(1)
      .max(maxLimit)
      .optional()
      .describe(
        `Maximum number of objects to return per page (1-${maxLimit}). Uses the API default if omitted.`,
      ),
    order: z
      .enum(["asc", "desc"])
      .optional()
      .describe("Sort by creation time: 'asc' for oldest-first, 'desc' for newest-first."),
    after: z
      .string()
      .optional()
      .describe(
        "Pagination cursor. Pass the `last_id` from the previous page to fetch the next page.",
      ),
    before: z
      .string()
      .optional()
      .describe(
        "Pagination cursor. Pass the `first_id` from the previous page to fetch the previous page.",
      ),
  };
}

/** Shared parameters for the insights / reporting endpoints. */
export const insightsShape = {
  since: z
    .string()
    .optional()
    .describe(
      "Start date of the reporting window (inclusive), YYYY-MM-DD. Combined with `until` into a date_range time filter.",
    ),
  until: z
    .string()
    .optional()
    .describe(
      "End date of the reporting window (inclusive), YYYY-MM-DD. Combined with `since` into a date_range time filter.",
    ),
  time_granularity: z
    .enum(["daily", "none"])
    .optional()
    .describe(
      "Aggregation bucket size: 'daily' for one row per day, or 'none' for a single aggregated row over the whole window.",
    ),
  aggregation_level: z
    .enum(["ad_account", "campaign", "ad_group", "ad"])
    .optional()
    .describe(
      "Scope each row is aggregated to (e.g. 'ad' to break results out per ad even when querying a campaign). Combine with `sort` + `limit` to rank entities.",
    ),
  fields: z
    .array(z.string())
    .optional()
    .describe(
      "Fields to project in each row, e.g. ['ad_id','ad_name','campaign_name','readable_time','impressions','clicks','spend','ctr','cpc','cpm'].",
    ),
  sort: z
    .array(
      z.object({
        field: z.string().describe("Field or metric to sort by, e.g. 'clicks' or 'spend'."),
        direction: z
          .enum(["asc", "desc"])
          .optional()
          .describe("Sort direction; omit to use the API default."),
      }),
    )
    .optional()
    .describe(
      'Sort expressions applied in order, e.g. [{ "field": "clicks", "direction": "desc" }] to rank by most clicks.',
    ),
  filters: z
    .array(z.string())
    .optional()
    .describe("Advanced filter expressions, passed through to the API as-is."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(10000)
    .optional()
    .describe("Maximum number of rows to return (1-10000)."),
  after: z
    .string()
    .optional()
    .describe("Pagination cursor: pass `last_id` from a previous page to fetch the next page."),
  before: z
    .string()
    .optional()
    .describe(
      "Pagination cursor: pass `first_id` from a previous page to fetch the previous page.",
    ),
};
