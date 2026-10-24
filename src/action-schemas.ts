import { z } from "zod";

const name = z.string().min(3).max(1000).regex(/\S/);
export const resourceId = z.string().min(1).regex(/\S/);
export const httpUrl = z
  .string()
  .url()
  .max(2048)
  .refine((s) => {
    const url = new URL(s);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  }, "Use an HTTP(S) URL without embedded credentials.");
const micros = z.number().int().safe();
const paused = z.literal("paused").default("paused");
export const accountShape = {
  expected_ad_account_id: resourceId.describe(
    "Copy the account ID from get_ad_account and confirm its currency/timezone with the user. Every action verifies this ID against the configured key.",
  ),
};
export const createShape = {
  ...accountShape,
  idempotency_key: z
    .string()
    .min(1)
    .max(255)
    .regex(/\S/)
    .refine((s) => !/[\r\n]/.test(s))
    .describe(
      "Persist a unique key per approved create. Retry the identical body with the identical key after an uncertain result; never generate a new key just to retry.",
    ),
};
const geo = z
  .object({
    countries: z
      .array(z.string().regex(/^[A-Z]{2}$/))
      .min(1)
      .optional(),
    include: z
      .array(z.object({ id: resourceId }).strict())
      .min(1)
      .max(2500)
      .optional(),
  })
  .strict()
  .refine(
    (v) => v.countries !== undefined || v.include !== undefined,
    "Specify countries or verified OpenAI location IDs.",
  );

export const campaignBody = z
  .object({
    name,
    description: z.string().optional(),
    status: paused,
    bidding_type: z.enum(["impressions", "clicks", "conversions"]),
    budget: z.union([
      z.object({ daily_spend_limit_micros: micros.min(1_000_000) }).strict(),
      z.object({ lifetime_spend_limit_micros: micros.min(1_000_000) }).strict(),
    ]),
    start_time: z.number().int().min(946684800).max(4102444800).optional(),
    end_time: z.number().int().min(946684800).max(4102444800).optional(),
    targeting: z
      .object({
        locations: geo.optional(),
        excluded_locations: geo.optional(),
        platforms: z
          .object({
            included: z
              .array(
                z.enum(["ios_app", "android_app", "web", "desktop_web", "ios_web", "android_web"]),
              )
              .min(1),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
    conversion_event_setting_ids: z.array(resourceId).length(1).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if ((v.bidding_type === "conversions") !== (v.conversion_event_setting_ids !== undefined)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Conversions require exactly one standard event setting; omit event settings for other objectives.",
      });
    }
    if (v.start_time !== undefined && v.end_time !== undefined && v.end_time <= v.start_time) {
      ctx.addIssue({ code: "custom", message: "end_time must be later than start_time." });
    }
  });

const bidding = z.union([
  z
    .object({
      strategy: z.literal("fixed_bid"),
      billing_event_type: z.enum(["click", "impression"]),
      max_bid_micros: micros.min(1).max(30_400_000_000_000),
    })
    .strict(),
  z
    .object({ strategy: z.literal("maximize_clicks"), billing_event_type: z.literal("click") })
    .strict(),
  z
    .object({
      strategy: z.literal("maximize_conversions"),
      billing_event_type: z.enum(["click", "impression"]),
    })
    .strict(),
]);
export const adGroupBody = z
  .object({
    campaign_id: resourceId,
    name,
    description: z.string().optional(),
    status: paused,
    context_hints: z.array(z.string().min(1)).max(2000).optional(),
    bidding_config: bidding,
  })
  .strict();
export const adBody = z
  .object({
    ad_group_id: resourceId,
    name,
    status: paused,
    creative: z
      .object({
        type: z.literal("chat_card"),
        title: z.string().min(3).max(50).regex(/\S/),
        body: z.string().max(100),
        target_url: httpUrl,
        file_id: resourceId,
      })
      .strict(),
  })
  .strict();
