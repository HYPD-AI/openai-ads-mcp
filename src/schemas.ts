import { z } from "zod";

/**
 * Monetary amounts in the OpenAI Ads API are expressed in "micros". This note is
 * appended to tool descriptions so models can present human-readable currency.
 */
export const MICROS_NOTE =
  "Monetary values are expressed in micros: 1,000,000 micros = 1 unit of the account's currency " +
  "(for example, $1.00 = 1,000,000 micros). Divide any *_micros value by 1,000,000 to show a " +
  "human-readable amount, and multiply by 1,000,000 to convert a currency amount into micros.";

/** Shared cursor-pagination parameters for list endpoints. */
export const paginationShape = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe(
      "Maximum number of objects to return per page (1-100). Uses the API default if omitted.",
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

/** Shared parameters for the insights / reporting endpoints. */
export const insightsShape = {
  since: z
    .string()
    .optional()
    .describe("Start date of the reporting window (inclusive), formatted as YYYY-MM-DD."),
  until: z
    .string()
    .optional()
    .describe("End date of the reporting window (inclusive), formatted as YYYY-MM-DD."),
  time_granularity: z
    .string()
    .optional()
    .describe(
      "Aggregation cadence within the window, e.g. 'daily' for one row per day or 'total' for a single aggregated row.",
    ),
  fields: z
    .array(z.string())
    .optional()
    .describe(
      "Subset of fields to return, e.g. ['impressions','clicks','spend','ctr','cpc','cpm']. Returns the default field set if omitted.",
    ),
};
