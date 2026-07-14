import { beforeEach, describe, expect, it, vi } from "vitest";

import { initializeI18n } from "../src/lib/i18n";
import {
  MemosApiError,
  MemosClient,
  type FetchLike,
} from "../src/lib/memos-api";

function memoResponse(content = "hello"): Response {
  return Response.json({
    name: "memos/abc-123",
    content,
    visibility: "PRIVATE",
  });
}

function fetchMockReturning(response: Response): ReturnType<typeof vi.fn<FetchLike>> {
  return vi.fn<FetchLike>().mockResolvedValue(response);
}

beforeEach(() => {
  initializeI18n("en");
});

describe("MemosClient", () => {
  it("creates a private memo with Bearer authentication", async () => {
    const fetchMock = fetchMockReturning(memoResponse());
    const client = new MemosClient(
      {
        instanceUrl: "https://memos.example.com/api/v1/",
        apiKey: " secret-token ",
      },
      fetchMock,
    );

    await expect(client.createMemo("hello")).resolves.toMatchObject({
      name: "memos/abc-123",
      content: "hello",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://memos.example.com/api/v1/memos",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Bearer secret-token",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ content: "hello", visibility: "PRIVATE" }),
      }),
    );
  });

  it("updates the returned memo resource with a content field mask", async () => {
    const fetchMock = fetchMockReturning(memoResponse("changed"));
    const client = new MemosClient(
      { instanceUrl: "https://memos.example.com", apiKey: "token" },
      fetchMock,
    );

    await client.updateMemo("memos/id with spaces", "changed");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://memos.example.com/api/v1/memos/id%20with%20spaces?updateMask=content",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          name: "memos/id with spaces",
          content: "changed",
        }),
      }),
    );
  });

  it("requires a usable API key and memo resource name", async () => {
    expect(
      () =>
        new MemosClient(
          { instanceUrl: "https://memos.example.com", apiKey: "  " },
          vi.fn<FetchLike>(),
        ),
    ).toThrow(/API key/);

    const client = new MemosClient(
      { instanceUrl: "https://memos.example.com", apiKey: "token" },
      vi.fn<FetchLike>(),
    );
    await expect(client.updateMemo("memos/a/b", "content")).rejects.toThrow(
      /memos\/\{id\}/,
    );
  });
});

describe("Memos API errors", () => {
  it("maps an API authentication response and keeps server details", async () => {
    const fetchMock = fetchMockReturning(
      Response.json(
        { code: 16, message: "Unauthenticated", details: ["expired"] },
        { status: 401 },
      ),
    );
    const client = new MemosClient(
      { instanceUrl: "https://memos.example.com", apiKey: "bad-token" },
      fetchMock,
    );

    const error = await client.createMemo("hello").catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(MemosApiError);
    expect(error).toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
      apiCode: 16,
      message: "Unauthenticated",
      userMessage: "The API key is invalid or expired. Update it in Settings.",
      details: ["expired"],
    });
  });

  it.each([
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [409, "CONFLICT"],
    [429, "RATE_LIMITED"],
    [503, "SERVER_ERROR"],
  ] as const)("maps HTTP %i to %s", async (status, code) => {
    const client = new MemosClient(
      { instanceUrl: "https://memos.example.com", apiKey: "token" },
      fetchMockReturning(new Response("upstream failure", { status })),
    );

    await expect(client.createMemo("hello")).rejects.toMatchObject({
      code,
      status,
    });
  });

  it("maps fetch failures without exposing implementation errors to the UI", async () => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockRejectedValue(new Error("getaddrinfo ENOTFOUND secret.internal"));
    const client = new MemosClient(
      { instanceUrl: "https://memos.example.com", apiKey: "token" },
      fetchMock,
    );

    const error = await client.createMemo("hello").catch((cause: unknown) => cause);
    expect(error).toMatchObject({
      code: "NETWORK_ERROR",
      userMessage:
        "Could not connect to the Memos instance. Check the address and your network.",
    });
  });

  it("rejects malformed successful responses", async () => {
    const client = new MemosClient(
      { instanceUrl: "https://memos.example.com", apiKey: "token" },
      fetchMockReturning(Response.json({ name: "memos/abc" })),
    );

    await expect(client.createMemo("hello")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      userMessage: "Memos returned unrecognizable data. Check the server version.",
    });
  });
});
