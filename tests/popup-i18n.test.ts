import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const localData: Record<string, unknown> = {};
const sessionData: Record<string, unknown> = {};
const queryTabs = vi.fn();
const executeScript = vi.fn();
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  localData["memos.config"] = {
    instanceUrl: "https://memos.example.com",
    apiKey: "token",
    defaultTag: "#inbox",
    clipOnOpen: false,
    language: "en",
  };
  for (const key of Object.keys(sessionData)) {
    delete sessionData[key];
  }
  queryTabs.mockReset();
  queryTabs.mockResolvedValue([]);
  executeScript.mockReset();
  executeScript.mockResolvedValue([{ result: null }]);
  fetchMock.mockReset();
  document.body.innerHTML = '<div id="app"></div>';

  vi.stubGlobal("fetch", fetchMock);

  vi.stubGlobal(
    "chrome",
    {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: localData[key] }),
        },
        session: {
          get: async (key: string) => ({ [key]: sessionData[key] }),
          set: async (items: Record<string, unknown>) => {
            Object.assign(sessionData, items);
          },
          remove: async (key: string) => {
            delete sessionData[key];
          },
        },
      },
      scripting: {
        executeScript,
      },
      tabs: {
        query: queryTabs,
      },
      runtime: {
        openOptionsPage: vi.fn(),
      },
    } as unknown as typeof chrome,
  );
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
  document.documentElement.lang = "";
  document.title = "";
});

describe("popup language", () => {
  it("uses the saved language preference for the composer", async () => {
    await import("../src/popup.ts");

    await vi.waitFor(() => {
      expect(document.documentElement.lang).toBe("en");
      expect(document.querySelector(".brand small")?.textContent).toBe(
        "Capture a thought in your own Memos",
      );
    });

    expect(document.title).toBe("Memos Clipper");
    expect(document.querySelector("#clipButton")?.textContent).toContain(
      "Clip this page",
    );
    expect(document.querySelector("#memoContent")?.getAttribute("placeholder")).toBe(
      "What's on your mind? Markdown is supported…",
    );
    expect(document.querySelector<HTMLTextAreaElement>("#memoContent")?.value).toBe("");
  });

  it("automatically fills a fresh composer when default clipping is enabled", async () => {
    localData["memos.config"] = {
      instanceUrl: "https://memos.example.com",
      apiKey: "token",
      defaultTag: "#inbox",
      clipOnOpen: true,
      language: "en",
    };
    queryTabs.mockResolvedValue([
      {
        id: 17,
        title: "Useful page",
        url: "https://example.com/read?id=42&utm_source=newsletter",
      },
    ]);

    await import("../src/popup.ts");

    await vi.waitFor(() => {
      expect(document.querySelector<HTMLTextAreaElement>("#memoContent")?.value).toBe(
        "[Useful page](https://example.com/read?id=42)\n\n#inbox",
      );
    });

    expect(sessionData["memos.composerState.17"]).toMatchObject({
      draft: "[Useful page](https://example.com/read?id=42)\n\n#inbox",
    });
  });

  it("renders the clip template with the page selection and description", async () => {
    localData["memos.config"] = {
      instanceUrl: "https://memos.example.com",
      apiKey: "token",
      defaultTag: "#inbox",
      clipOnOpen: true,
      clipTemplate: "{{content}}\n\n{{description}}\n\n[{{title}}]({{url}})",
      language: "en",
    };
    queryTabs.mockResolvedValue([
      {
        id: 31,
        title: "Designing a personal archive",
        url: "https://example.com/archive?utm_source=x",
      },
    ]);
    executeScript.mockResolvedValue([
      {
        result: {
          selection: "  Keep this quote  ",
          description: "A practical guide.",
        },
      },
    ]);

    await import("../src/popup.ts");

    await vi.waitFor(() => {
      expect(document.querySelector<HTMLTextAreaElement>("#memoContent")?.value).toBe(
        "Keep this quote\n\nA practical guide.\n\n[Designing a personal archive](https://example.com/archive)",
      );
    });
    expect(executeScript).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ tabId: 31, allFrames: true }),
      }),
    );
    expect(executeScript).toHaveBeenCalledOnce();
    expect(sessionData["memos.composerState.31"]).toMatchObject({
      draft: "Keep this quote\n\nA practical guide.\n\n[Designing a personal archive](https://example.com/archive)",
    });
  });

  it("merges the initial capture with a fresh one on manual clip", async () => {
    localData["memos.config"] = {
      instanceUrl: "https://memos.example.com",
      apiKey: "token",
      defaultTag: "#inbox",
      clipOnOpen: false,
      clipTemplate: "{{content}}\n\n{{description}}\n\n[{{title}}]({{url}})",
      language: "en",
    };
    queryTabs.mockResolvedValue([
      {
        id: 55,
        title: "Useful page",
        url: "https://example.com/read",
      },
    ]);
    executeScript
      .mockResolvedValueOnce([
        { result: { selection: "Page pick", description: "" } },
      ])
      .mockResolvedValue([
        { result: { selection: "", description: "Fresh guide." } },
      ]);

    await import("../src/popup.ts");

    await vi.waitFor(() => {
      expect(executeScript).toHaveBeenCalledOnce();
    });

    document.querySelector<HTMLButtonElement>("#clipButton")?.click();

    await vi.waitFor(() => {
      expect(document.querySelector<HTMLTextAreaElement>("#memoContent")?.value).toBe(
        "Page pick\n\nFresh guide.\n\n[Useful page](https://example.com/read)",
      );
    });
  });

  it("clips without extras when script injection fails", async () => {
    localData["memos.config"] = {
      instanceUrl: "https://memos.example.com",
      apiKey: "token",
      defaultTag: "#inbox",
      clipOnOpen: true,
      language: "en",
    };
    queryTabs.mockResolvedValue([
      {
        id: 42,
        title: "Useful page",
        url: "https://example.com/read",
      },
    ]);
    executeScript.mockRejectedValue(new Error("cannot inject"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await import("../src/popup.ts");

    await vi.waitFor(() => {
      expect(document.querySelector<HTMLTextAreaElement>("#memoContent")?.value).toBe(
        "[Useful page](https://example.com/read)\n\n#inbox",
      );
    });
    expect(warn).toHaveBeenCalled();
  });

  it("does not replace an existing tab draft when default clipping is enabled", async () => {
    localData["memos.config"] = {
      instanceUrl: "https://memos.example.com",
      apiKey: "token",
      defaultTag: "#inbox",
      clipOnOpen: true,
      language: "en",
    };
    sessionData["memos.composerState.17"] = {
      draft: "Keep this note",
      updatedAt: 1,
    };
    queryTabs.mockResolvedValue([
      {
        id: 17,
        title: "Useful page",
        url: "https://example.com/read?id=42&utm_source=newsletter",
      },
    ]);

    await import("../src/popup.ts");

    await vi.waitFor(() => {
      expect(document.querySelector<HTMLTextAreaElement>("#memoContent")?.value).toBe(
        "Keep this note",
      );
    });
    expect(sessionData["memos.composerState.17"]).toMatchObject({
      draft: "Keep this note",
    });
  });

  it("does not create a memo when the duplicate-link confirmation is cancelled", async () => {
    sessionData["memos.composerState.23"] = {
      draft: "https://example.com/read?id=42",
      updatedAt: 1,
    };
    queryTabs.mockResolvedValue([{ id: 23 }]);
    fetchMock.mockResolvedValueOnce(
      Response.json({
        memos: [
          {
            name: "memos/existing",
            content:
              "Saved https://example.com/read?id=42&utm_source=newsletter",
            visibility: "PRIVATE",
          },
        ],
      }),
    );
    const confirm = vi.spyOn(window, "confirm");

    await import("../src/popup.ts");

    await vi.waitFor(() => {
      expect(document.querySelector<HTMLTextAreaElement>("#memoContent")?.value).toBe(
        "https://example.com/read?id=42",
      );
    });

    document.querySelector<HTMLButtonElement>("#submitButton")?.click();

    await vi.waitFor(() => {
      expect(document.querySelector("#duplicateMessage")?.textContent).toBe(
        "Found 1 existing memo(s) with the same link. Save another one anyway?",
      );
      expect(
        document.querySelector<HTMLElement>("#duplicateWarning")?.hidden,
      ).toBe(false);
    });

    document
      .querySelector<HTMLButtonElement>("#duplicateCancelButton")
      ?.click();

    await vi.waitFor(() => {
      expect(document.querySelector("#status")?.textContent).toBe(
        "Not saved. You can keep editing this memo.",
      );
      expect(
        document.querySelector<HTMLElement>("#duplicateWarning")?.hidden,
      ).toBe(true);
    });

    expect(confirm).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/memos?"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(sessionData["memos.composerState.23"]).not.toHaveProperty(
      "lastMemoName",
    );
  });

  it("creates the memo when the inline duplicate warning is accepted", async () => {
    sessionData["memos.composerState.24"] = {
      draft: "https://example.com/read?id=42",
      updatedAt: 1,
    };
    queryTabs.mockResolvedValue([{ id: 24 }]);
    fetchMock
      .mockResolvedValueOnce(
        Response.json({
          memos: [
            {
              name: "memos/existing",
              content: "https://example.com/read?id=42",
              visibility: "PRIVATE",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          name: "memos/new",
          content: "https://example.com/read?id=42\n\n#inbox",
          visibility: "PRIVATE",
        }),
      );

    await import("../src/popup.ts");

    await vi.waitFor(() => {
      expect(document.querySelector<HTMLTextAreaElement>("#memoContent")?.value).toBe(
        "https://example.com/read?id=42",
      );
    });

    document.querySelector<HTMLButtonElement>("#submitButton")?.click();

    await vi.waitFor(() => {
      expect(
        document.querySelector<HTMLElement>("#duplicateWarning")?.hidden,
      ).toBe(false);
    });

    document
      .querySelector<HTMLButtonElement>("#duplicateContinueButton")
      ?.click();

    await vi.waitFor(() => {
      expect(sessionData["memos.composerState.24"]).toMatchObject({
        lastMemoName: "memos/new",
      });
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({ method: "POST" }),
    );
  });
});
