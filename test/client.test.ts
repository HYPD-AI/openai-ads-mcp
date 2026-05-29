import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAIAdsClient, OpenAIAdsError } from "../src/client.js";

const config = { apiKey: "test-key", baseUrl: "https://example.test/v1" };

function mockFetch(response: Response) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("OpenAIAdsClient.get", () => {
  it("sends auth + accept headers and parses the JSON response", async () => {
    const fetchMock = mockFetch(
      new Response(JSON.stringify({ id: "acct_1", object: "ad_account" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = new OpenAIAdsClient(config);

    const data = await client.get("/ad_account");

    expect(data).toEqual({ id: "acct_1", object: "ad_account" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://example.test/v1/ad_account");
    expect(init.method).toBe("GET");
    expect(init.headers.Authorization).toBe("Bearer test-key");
    expect(init.headers.Accept).toBe("application/json");
    expect(init.body).toBeUndefined();
  });

  it("serializes query params, skipping nullish values and repeating arrays", async () => {
    const fetchMock = mockFetch(new Response("[]", { status: 200 }));
    const client = new OpenAIAdsClient(config);

    await client.get("/ad_account/insights", {
      since: "2026-01-01",
      until: undefined,
      fields: ["impressions", "clicks"],
    });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      "https://example.test/v1/ad_account/insights?since=2026-01-01&fields=impressions&fields=clicks",
    );
  });

  it("throws OpenAIAdsError carrying the status and API message on non-2xx", async () => {
    mockFetch(
      new Response(JSON.stringify({ error: { message: "Invalid API key" } }), { status: 401 }),
    );
    const client = new OpenAIAdsClient(config);

    await expect(client.get("/ad_account")).rejects.toMatchObject({
      name: "OpenAIAdsError",
      status: 401,
      message: "Invalid API key",
    });
  });

  it("wraps network failures as OpenAIAdsError with status 0", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    vi.stubGlobal("fetch", fn);
    const client = new OpenAIAdsClient(config);

    const error = await client.get("/ad_account").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(OpenAIAdsError);
    expect((error as OpenAIAdsError).status).toBe(0);
  });
});

describe("OpenAIAdsClient.post", () => {
  it("sends a JSON body with a content-type header", async () => {
    const fetchMock = mockFetch(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = new OpenAIAdsClient(config);

    await client.post("/campaigns", { name: "Test" });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ name: "Test" }));
  });
});
