import type { Config } from "./config.js";
import { VERSION } from "./version.js";

/** A scalar query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

/** Query-string parameters. Arrays are serialized as repeated keys; nullish values are skipped. */
export type QueryParams = Record<string, QueryValue | QueryValue[]>;

/**
 * Error thrown when the OpenAI Ads API returns a non-2xx response, or when the
 * request itself fails (network error). `status` is 0 for network failures.
 */
export class OpenAIAdsError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "OpenAIAdsError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Minimal typed HTTP client for the OpenAI Ads API.
 *
 * GET is always available. POST requires an explicit write opt-in and is never
 * automatically retried. Creation tools supply stable idempotency keys.
 */
export class OpenAIAdsClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  readonly enableWrites: boolean;

  constructor(config: Config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.enableWrites = config.enableWrites === true;
  }

  /** Issue a `GET` request and return the parsed JSON response. */
  get<T = unknown>(path: string, query?: QueryParams): Promise<T> {
    return this.request<T>("GET", path, { query });
  }

  assertWritesEnabled(): void {
    if (!this.enableWrites) {
      throw new Error("Actions are disabled. Set OPENAI_ADS_ENABLE_WRITES=true to opt in.");
    }
  }

  /** POST is gated independently of tool registration. Never automatically retried. */
  async post<T = unknown>(
    path: string,
    body?: unknown,
    query?: QueryParams,
    idempotencyKey?: string,
  ): Promise<T> {
    this.assertWritesEnabled();
    if (
      idempotencyKey !== undefined &&
      (!/\S/.test(idempotencyKey) || idempotencyKey.length > 255 || /[\r\n]/.test(idempotencyKey))
    ) {
      throw new Error("Invalid Idempotency-Key.");
    }
    return this.request<T>("POST", path, { query, body, idempotencyKey });
  }

  private buildUrl(path: string, query?: QueryParams): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);
    if (query) {
      for (const [key, rawValue] of Object.entries(query)) {
        const values = Array.isArray(rawValue) ? rawValue : [rawValue];
        for (const value of values) {
          if (value === undefined || value === null) continue;
          url.searchParams.append(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    options: { query?: QueryParams; body?: unknown; idempotencyKey?: string },
  ): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
      "User-Agent": `openai-ads-mcp/${VERSION}`,
    };
    if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

    let body: string | undefined;
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body,
        redirect: "error",
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new OpenAIAdsError(
        0,
        `Network error calling ${method} ${path}: ${this.redact(reason)}`,
        undefined,
      );
    }

    const text = await response.text();
    const data: unknown = text.length > 0 ? safeJsonParse(text) : undefined;

    if (!response.ok) {
      const message =
        extractErrorMessage(data) ?? `${response.status} ${response.statusText}`.trim();
      const safeBody = safeJsonParse(this.redact(JSON.stringify(data ?? text)));
      throw new OpenAIAdsError(response.status, this.redact(message), safeBody);
    }

    return data as T;
  }

  private redact(value: string): string {
    return value
      .replaceAll(this.apiKey, "[REDACTED]")
      .replace(/Bearer\s+[^\s"\\]+/gi, "Bearer [REDACTED]");
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Best-effort extraction of a human-readable message from an API error body. */
function extractErrorMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const record = data as Record<string, unknown>;

  const error = record.error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }

  if (typeof record.message === "string") return record.message;
  return undefined;
}
