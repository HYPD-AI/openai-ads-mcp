import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";

const EXPECTED_TOOLS = [
  "get_ad_account",
  "list_campaigns",
  "get_campaign",
  "list_ad_groups",
  "get_ad_group",
  "list_ads",
  "get_ad",
  "get_account_insights",
  "get_campaign_insights",
  "get_ad_group_insights",
  "get_ad_insights",
].sort();

describe("buildServer", () => {
  it("registers exactly the expected read-only tools", async () => {
    const server = buildServer({ apiKey: "test", baseUrl: "https://example.test/v1" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "0.0.0" });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name).sort()).toEqual(EXPECTED_TOOLS);
    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint).toBe(true);
    }

    await client.close();
    await server.close();
  });
});
