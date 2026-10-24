import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { accountShape, httpUrl } from "../action-schemas.js";
import type { OpenAIAdsClient } from "../client.js";
import { ACTION_ANNOTATIONS, APPROVAL_NOTE, verifyAccount } from "./actions.js";
import { runTool } from "./result.js";

export function registerFileActions(server: McpServer, client: OpenAIAdsClient): void {
  server.registerTool(
    "upload_image",
    {
      title: "Upload an ad image",
      description:
        APPROVAL_NOTE +
        "Upload an approved public HTTP(S) image URL to /upload. Returns an account-scoped file_id for create_ad. This is not idempotent: do not blindly retry an uncertain upload. This tool does not read local files or generate images.",
      inputSchema: { ...accountShape, image_url: httpUrl },
      annotations: ACTION_ANNOTATIONS,
    },
    (args) =>
      runTool(async () => {
        await verifyAccount(client, args.expected_ad_account_id);
        return client.post("/upload", { image_url: args.image_url });
      }),
  );
}
