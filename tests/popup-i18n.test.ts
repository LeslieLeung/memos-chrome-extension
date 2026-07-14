import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const localData: Record<string, unknown> = {};
const sessionData: Record<string, unknown> = {};
const queryTabs = vi.fn();

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
  document.body.innerHTML = '<div id="app"></div>';

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
        "https://example.com/read?id=42",
      );
    });

    expect(sessionData["memos.composerState.17"]).toMatchObject({
      draft: "https://example.com/read?id=42",
    });
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
});
