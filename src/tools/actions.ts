import type { OpenAIAdsClient } from "../client.js";

export const ACTION_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};
export const APPROVAL_NOTE =
  "Consequential action: obtain approval of the exact account, currency, budget, destination and creative before creating or uploading. This server creates paused resources only and has no activation tool. ";

export async function verifyAccount(client: OpenAIAdsClient, expectedId: string): Promise<void> {
  client.assertWritesEnabled();
  const account = await client.get<{ id?: string }>("/ad_account");
  if (account.id !== expectedId)
    throw new Error(
      "Account mismatch: the configured API key does not belong to the approved account. No action was taken.",
    );
}

/** Preserve the created ID if a subsequent verification read fails. Never recreate automatically. */
export async function createAndReadBack(
  client: OpenAIAdsClient,
  path: string,
  body: unknown,
  key: string,
): Promise<unknown> {
  const created = await client.post<{ id?: string }>(path, body, undefined, key);
  if (!created.id)
    throw new Error(
      "Create returned no resource ID. Outcome is uncertain; retry only the identical body and Idempotency-Key.",
    );
  try {
    return await client.get(`${path}/${encodeURIComponent(created.id)}`, {
      "include[]": ["serving_issues"],
    });
  } catch (error) {
    throw new Error(
      `Resource ${created.id} was created, but read-back failed: ${error instanceof Error ? error.message : "unknown error"}. Inspect that ID; do not create another resource with a new key.`,
      { cause: error },
    );
  }
}
