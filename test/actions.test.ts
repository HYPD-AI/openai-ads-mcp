import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "../src/server.js";
import { adBody, adGroupBody, campaignBody } from "../src/action-schemas.js";

const campaign = {
  name: "Imported campaign",
  bidding_type: "clicks",
  budget: { daily_spend_limit_micros: 5_000_000 },
};
const adGroup = {
  name: "Imported group",
  campaign_id: "cmpn_1",
  context_hints: ["Review Google Ads performance"],
  bidding_config: { billing_event_type: "click", strategy: "maximize_clicks" },
};
const ad = {
  name: "Imported ad",
  ad_group_id: "adgrp_1",
  creative: {
    type: "chat_card",
    title: "Ask Your Google Ads",
    body: "Answers from your live ad data.",
    file_id: "file_1",
    target_url: "https://example.com/product",
  },
};
const approval = { expected_ad_account_id: "adacct_1", idempotency_key: "import-1" };
const closers: (() => Promise<void>)[] = [];

async function connect(enableWrites = true) {
  const server = buildServer({
    apiKey: "test-key",
    baseUrl: "https://example.test/v1",
    enableWrites,
  });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([client.connect(a), server.connect(b)]);
  closers.push(async () => {
    await client.close();
    await server.close();
  });
  return client;
}
function responses(...values: unknown[]) {
  const fn = vi.fn();
  for (const value of values)
    fn.mockResolvedValueOnce(new Response(JSON.stringify(value), { status: 200 }));
  vi.stubGlobal("fetch", fn);
  return fn;
}
afterEach(async () => {
  for (const close of closers.splice(0)) await close();
  vi.unstubAllGlobals();
});

describe("opt-in actions", () => {
  it("adds only the five intended actions and no activation/update/archive tools", async () => {
    const c = await connect();
    const { tools } = await c.listTools();
    const actions = tools.filter((t) => t.annotations?.readOnlyHint === false);
    expect(actions.map((t) => t.name).sort()).toEqual([
      "create_ad",
      "create_ad_group",
      "create_campaign",
      "preview_ad",
      "upload_image",
    ]);
    expect(tools).toHaveLength(16);
    for (const t of actions) expect(t.annotations?.idempotentHint).toBe(false);
  });

  it("rejects a hidden action in default read-only mode without any request", async () => {
    const fn = responses();
    const c = await connect(false);
    const r = await c.callTool({
      name: "create_campaign",
      arguments: { ...approval, body: campaign },
    });
    expect(r.isError).toBe(true);
    expect(fn).not.toHaveBeenCalled();
  });

  it("creates paused, forwards exact micros/key, and reads back serving issues", async () => {
    const fn = responses(
      { id: "adacct_1" },
      { id: "cmpn_1" },
      { id: "cmpn_1", status: "paused", serving_issues: [] },
    );
    const c = await connect();
    const r = await c.callTool({
      name: "create_campaign",
      arguments: { ...approval, body: campaign },
    });
    expect(r.isError).not.toBe(true);
    expect(JSON.parse(fn.mock.calls[1]![1].body)).toEqual({ ...campaign, status: "paused" });
    expect(fn.mock.calls[1]![1].headers["Idempotency-Key"]).toBe("import-1");
    expect(fn.mock.calls[2]![0]).toContain("/campaigns/cmpn_1?include%5B%5D=serving_issues");
    expect(JSON.stringify(r)).toContain("paused");
  });

  it("does not POST when the configured key belongs to another account", async () => {
    const fn = responses({ id: "adacct_other" });
    const c = await connect();
    const r = await c.callTool({
      name: "create_campaign",
      arguments: { ...approval, body: campaign },
    });
    expect(r.isError).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("preserves the created ID when read-back fails and never creates again", async () => {
    const fn = responses({ id: "adacct_1" }, { id: "cmpn_created" });
    fn.mockRejectedValueOnce(new Error("read timed out"));
    const c = await connect();
    const r = await c.callTool({
      name: "create_campaign",
      arguments: { ...approval, body: campaign },
    });
    expect(r.isError).toBe(true);
    expect(JSON.stringify(r)).toContain("cmpn_created");
    expect(fn.mock.calls.filter((call) => call[1].method === "POST")).toHaveLength(1);
  });

  it("checks parent objective before creating an ad group", async () => {
    const fn = responses({ id: "adacct_1" }, { id: "cmpn_1", bidding_type: "impressions" });
    const c = await connect();
    const r = await c.callTool({
      name: "create_ad_group",
      arguments: { ...approval, body: adGroup },
    });
    expect(r.isError).toBe(true);
    expect(fn.mock.calls.every((call) => call[1].method === "GET")).toBe(true);
  });

  it("accepts automatic bidding without inventing a manual bid", async () => {
    const fn = responses(
      { id: "adacct_1" },
      { id: "cmpn_1", bidding_type: "clicks" },
      { id: "adgrp_1" },
      { id: "adgrp_1", status: "paused" },
    );
    const c = await connect();
    const r = await c.callTool({
      name: "create_ad_group",
      arguments: { ...approval, body: adGroup },
    });
    expect(r.isError).not.toBe(true);
    expect(JSON.parse(fn.mock.calls[2]![1].body).bidding_config).toEqual(adGroup.bidding_config);
  });

  it("paginates conversion settings and rejects custom goals before POST", async () => {
    const fn = responses(
      { id: "adacct_1" },
      { data: [], has_more: true, last_id: "ces_page1" },
      {
        data: [
          { id: "ces_custom", event_type: "custom", archived: false, source_ids: ["source_1"] },
        ],
        has_more: false,
      },
    );
    const c = await connect();
    const r = await c.callTool({
      name: "create_campaign",
      arguments: {
        ...approval,
        body: {
          ...campaign,
          bidding_type: "conversions",
          conversion_event_setting_ids: ["ces_custom"],
        },
      },
    });
    expect(r.isError).toBe(true);
    expect(fn.mock.calls[2]![0]).toContain("after=ces_page1");
    expect(fn.mock.calls.every((call) => call[1].method === "GET")).toBe(true);
  });

  it("uploads only the approved URL and returns the file token", async () => {
    const fn = responses({ id: "adacct_1" }, { file_id: "file_1" });
    const c = await connect();
    const r = await c.callTool({
      name: "upload_image",
      arguments: { expected_ad_account_id: "adacct_1", image_url: "https://example.com/image.png" },
    });
    expect(r.isError).not.toBe(true);
    expect(fn.mock.calls[1]![0]).toBe("https://example.test/v1/upload");
    expect(JSON.parse(fn.mock.calls[1]![1].body)).toEqual({
      image_url: "https://example.com/image.png",
    });
  });

  it("creates and reads back a paused ad with a verified parent", async () => {
    const fn = responses(
      { id: "adacct_1" },
      { id: "adgrp_1", product_set: null },
      { id: "ad_1" },
      { id: "ad_1", status: "paused", review_status: "in_review" },
    );
    const c = await connect();
    const r = await c.callTool({ name: "create_ad", arguments: { ...approval, body: ad } });
    expect(r.isError).not.toBe(true);
    expect(JSON.parse(fn.mock.calls[2]![1].body)).toEqual({ ...ad, status: "paused" });
    expect(JSON.stringify(r)).toContain("in_review");
  });

  it("previews an existing ad using a scoped POST without activation", async () => {
    const fn = responses({ id: "adacct_1" }, { preview_url: "https://example.com/preview" });
    const c = await connect();
    await c.callTool({
      name: "preview_ad",
      arguments: { expected_ad_account_id: "adacct_1", ad_id: "ad/1" },
    });
    expect(fn.mock.calls[1]![0]).toBe("https://example.test/v1/ads/ad%2F1/preview");
  });

  it.each([
    { ...campaign, status: "active" },
    {
      ...campaign,
      budget: { daily_spend_limit_micros: 5_000_000, lifetime_spend_limit_micros: 10_000_000 },
    },
    { ...campaign, budget: { daily_spend_limit_micros: 1.5 } },
    { ...campaign, mode: "product_feed" },
    { ...campaign, targeting: { keywords: ["unsupported"] } },
  ])("rejects unsafe or unsupported campaign input before network", async (body) => {
    const fn = responses();
    const c = await connect();
    const r = await c.callTool({ name: "create_campaign", arguments: { ...approval, body } });
    expect(r.isError).toBe(true);
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("action schemas", () => {
  it("requires one goal for conversions and none for clicks", () => {
    expect(campaignBody.safeParse({ ...campaign, bidding_type: "conversions" }).success).toBe(
      false,
    );
    expect(
      campaignBody.safeParse({ ...campaign, conversion_event_setting_ids: ["ces_1"] }).success,
    ).toBe(false);
  });
  it("rejects a bid cap on automatic bidding and missing caps on fixed bidding", () => {
    expect(
      adGroupBody.safeParse({
        ...adGroup,
        bidding_config: { ...adGroup.bidding_config, max_bid_micros: 100 },
      }).success,
    ).toBe(false);
    expect(
      adGroupBody.safeParse({
        ...adGroup,
        bidding_config: { strategy: "fixed_bid", billing_event_type: "click" },
      }).success,
    ).toBe(false);
  });
  it("rejects oversized copy, missing image, and non-web/credential URLs", () => {
    for (const creative of [
      { ...ad.creative, title: "x".repeat(51) },
      { ...ad.creative, body: "x".repeat(101) },
      { ...ad.creative, file_id: undefined },
      { ...ad.creative, target_url: "file:///tmp/image" },
      { ...ad.creative, target_url: "https://user:password@example.com" },
    ]) {
      expect(adBody.safeParse({ ...ad, creative }).success).toBe(false);
    }
  });
});
