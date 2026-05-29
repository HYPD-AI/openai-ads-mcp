import { describe, expect, it } from "vitest";
import { DEFAULT_BASE_URL, loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("throws when the API key is missing", () => {
    expect(() => loadConfig({})).toThrow(/OPENAI_ADS_API_KEY/);
  });

  it("throws when the API key is blank", () => {
    expect(() => loadConfig({ OPENAI_ADS_API_KEY: "   " })).toThrow(/OPENAI_ADS_API_KEY/);
  });

  it("uses the default base URL when no override is set", () => {
    const config = loadConfig({ OPENAI_ADS_API_KEY: "key" });
    expect(config).toEqual({ apiKey: "key", baseUrl: DEFAULT_BASE_URL });
  });

  it("trims the key and strips trailing slashes from a base URL override", () => {
    const config = loadConfig({
      OPENAI_ADS_API_KEY: "  key  ",
      OPENAI_ADS_BASE_URL: "https://example.test/v1///",
    });
    expect(config).toEqual({ apiKey: "key", baseUrl: "https://example.test/v1" });
  });
});
