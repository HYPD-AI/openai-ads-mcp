import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAIAdsClient } from "../src/client.js";
import { insightsQuery } from "../src/tools/insights.js";

describe("insightsQuery", () => {
  it("folds since/until into a single time_ranges[] date_range expression", () => {
    expect(insightsQuery({ since: "2026-04-25", until: "2026-05-01" })["time_ranges[]"]).toEqual([
      '{"type":"date_range","since":"2026-04-25","until":"2026-05-01"}',
    ]);
  });

  it("uses bracketed keys for fields, sort, and filters and JSON-encodes sort", () => {
    const query = insightsQuery({
      fields: ["ad_id", "clicks"],
      sort: [{ field: "clicks", direction: "desc" }],
      filters: ["clicks > 0"],
    });
    expect(query["fields[]"]).toEqual(["ad_id", "clicks"]);
    expect(query["sort[]"]).toEqual(['{"field":"clicks","direction":"desc"}']);
    expect(query["filters[]"]).toEqual(["clicks > 0"]);
  });

  it("passes scalar params through and omits absent array params", () => {
    const query = insightsQuery({ time_granularity: "none", aggregation_level: "ad", limit: 1 });
    expect(query).toMatchObject({ time_granularity: "none", aggregation_level: "ad", limit: 1 });
    expect(query["time_ranges[]"]).toBeUndefined();
    expect(query["fields[]"]).toBeUndefined();
    expect(query["sort[]"]).toBeUndefined();
  });
});

describe("insights query serialization through the client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("serializes bracketed array params as repeated, URL-encoded query keys", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        urls.push(url);
        return Promise.resolve(
          new Response(JSON.stringify({ object: "list", data: [] }), { status: 200 }),
        );
      }),
    );

    const client = new OpenAIAdsClient({ apiKey: "k", baseUrl: "https://example.test/v1" });
    await client.get(
      "/ad_account/insights",
      insightsQuery({ since: "2026-04-25", until: "2026-05-01", fields: ["ad_id", "clicks"] }),
    );

    const url = urls[0]!;
    expect(url).toContain("fields%5B%5D=ad_id");
    expect(url).toContain("fields%5B%5D=clicks");
    expect(url).toContain("time_ranges%5B%5D=");
  });
});
