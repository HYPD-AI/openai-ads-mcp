import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { OpenAIAdsError } from "../client.js";

/** Annotations shared by every (read-only) tool exposed by this server. */
export const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  openWorldHint: true,
};

function stringify(data: unknown): string {
  if (typeof data === "string") return data;
  if (data === undefined) return "(empty response)";
  return JSON.stringify(data, null, 2);
}

/**
 * Run an async tool body and convert its result — or any thrown error — into a
 * well-formed MCP tool result. API errors are surfaced as `isError` results
 * carrying the HTTP status and response body; they are never swallowed.
 */
export async function runTool(work: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    const data = await work();
    return { content: [{ type: "text", text: stringify(data) }] };
  } catch (error) {
    if (error instanceof OpenAIAdsError) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `OpenAI Ads API error (HTTP ${error.status}): ${error.message}\n\n${stringify(
              error.body,
            )}`,
          },
        ],
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { isError: true, content: [{ type: "text", text: `Error: ${message}` }] };
  }
}
