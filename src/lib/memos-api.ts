import { buildApiBaseUrl } from "./config";
import { t } from "./i18n";
import type { ExtensionConfig, Memo } from "./types";
import type { TranslationKey } from "./i18n";

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type MemosApiErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "HTTP_ERROR"
  | "NETWORK_ERROR"
  | "ABORTED"
  | "INVALID_RESPONSE";

interface MemosApiErrorOptions {
  status?: number;
  apiCode?: string | number;
  details?: unknown;
  cause?: unknown;
}

export class MemosApiError extends Error {
  readonly code: MemosApiErrorCode;
  readonly userMessage: string;
  readonly status?: number;
  readonly apiCode?: string | number;
  readonly details?: unknown;
  override readonly cause?: unknown;

  constructor(
    code: MemosApiErrorCode,
    message: string,
    options: MemosApiErrorOptions = {},
  ) {
    super(message);
    this.name = "MemosApiError";
    this.code = code;
    this.userMessage = userMessageForCode(code);
    this.status = options.status;
    this.apiCode = options.apiCode;
    this.details = options.details;
    this.cause = options.cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function userMessageForCode(code: MemosApiErrorCode): string {
  return t(`api.error.${code}` as TranslationKey);
}

function errorCodeForStatus(status: number): MemosApiErrorCode {
  switch (status) {
    case 400:
    case 422:
      return "INVALID_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 429:
      return "RATE_LIMITED";
    default:
      return status >= 500 ? "SERVER_ERROR" : "HTTP_ERROR";
  }
}

function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 401:
      return "The API key is invalid or expired.";
    case 403:
      return "The API key does not have permission to perform this action.";
    case 404:
      return "The Memos instance or memo was not found.";
    case 429:
      return "The Memos instance is receiving too many requests.";
    default:
      return status >= 500
        ? "The Memos instance encountered an error."
        : `The Memos request failed with status ${status}.`;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson(text: string): unknown {
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function parseMemo(value: unknown): Memo {
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    typeof value.content !== "string" ||
    typeof value.visibility !== "string"
  ) {
    throw new MemosApiError(
      "INVALID_RESPONSE",
      "The Memos instance returned an invalid memo response.",
      { details: value },
    );
  }
  return value as Memo;
}

function memoResourceName(input: string): { id: string; name: string } {
  const value = input.trim();
  const id = value.startsWith("memos/") ? value.slice("memos/".length) : value;
  if (!id || id.includes("/") || id === "." || id === "..") {
    throw new TypeError("Memo name must be in the form memos/{id}.");
  }
  return { id, name: `memos/${id}` };
}

export class MemosClient {
  readonly apiBaseUrl: string;
  private readonly apiKey: string;
  private readonly fetchImpl: FetchLike;

  constructor(
    config: Pick<ExtensionConfig, "instanceUrl" | "apiKey">,
    fetchImpl?: FetchLike,
  ) {
    this.apiBaseUrl = buildApiBaseUrl(config.instanceUrl);
    this.apiKey = config.apiKey.trim();
    if (!this.apiKey) {
      throw new TypeError("API key is required.");
    }

    const globalFetch = globalThis.fetch;
    if (!fetchImpl && typeof globalFetch !== "function") {
      throw new TypeError("A fetch implementation is required.");
    }
    this.fetchImpl = fetchImpl ?? globalFetch.bind(globalThis);
  }

  async createMemo(content: string): Promise<Memo> {
    return this.requestMemo("/memos", {
      method: "POST",
      body: JSON.stringify({ content, visibility: "PRIVATE" }),
    });
  }

  async updateMemo(nameOrId: string, content: string): Promise<Memo> {
    const memo = memoResourceName(nameOrId);
    return this.requestMemo(
      `/memos/${encodeURIComponent(memo.id)}?updateMask=content`,
      {
        method: "PATCH",
        body: JSON.stringify({ name: memo.name, content }),
      },
    );
  }

  private async requestMemo(path: string, init: RequestInit): Promise<Memo> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.apiBaseUrl}${path}`, {
        ...init,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...init.headers,
        },
      });
    } catch (cause) {
      if (cause instanceof MemosApiError) {
        throw cause;
      }
      if (isRecord(cause) && cause.name === "AbortError") {
        throw new MemosApiError("ABORTED", "The Memos request was cancelled.", {
          cause,
        });
      }
      throw new MemosApiError(
        "NETWORK_ERROR",
        "Could not connect to the Memos instance.",
        { cause },
      );
    }

    let responseText = "";
    try {
      responseText = await response.text();
    } catch (cause) {
      throw new MemosApiError(
        "INVALID_RESPONSE",
        "The Memos response could not be read.",
        { status: response.status, cause },
      );
    }
    const data = parseJson(responseText);

    if (!response.ok) {
      const payload = isRecord(data) ? data : undefined;
      const serverMessage =
        typeof payload?.message === "string" && payload.message.trim()
          ? payload.message.trim()
          : undefined;
      throw new MemosApiError(
        errorCodeForStatus(response.status),
        serverMessage ?? defaultMessageForStatus(response.status),
        {
          status: response.status,
          apiCode:
            typeof payload?.code === "string" || typeof payload?.code === "number"
              ? payload.code
              : undefined,
          details: payload?.details ?? data,
        },
      );
    }

    return parseMemo(data);
  }
}
