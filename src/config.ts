/** Resolved runtime configuration for the server. */
export interface Config {
  /** OpenAI Ads API key (sent as a Bearer token). Each key is scoped to one ad account. */
  apiKey: string;
  /** Base URL for the Ads API, normalized without a trailing slash. */
  baseUrl: string;
}

/** Default base URL for the OpenAI Ads API. */
export const DEFAULT_BASE_URL = "https://api.ads.openai.com/v1";

/**
 * Read and validate configuration from environment variables.
 *
 * @throws Error with an actionable message when `OPENAI_ADS_API_KEY` is missing.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const apiKey = env.OPENAI_ADS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_ADS_API_KEY environment variable. Set it to your OpenAI Ads API key. " +
        "See https://github.com/hypd-ai/openai-ads-mcp#configuration",
    );
  }

  const override = env.OPENAI_ADS_BASE_URL?.trim();
  const baseUrl = (override && override.length > 0 ? override : DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );

  return { apiKey, baseUrl };
}
