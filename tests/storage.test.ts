import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_CLIP_TEMPLATE } from "../src/lib/template";
import {
  clearComposerState,
  loadComposerState,
  loadConfig,
  saveComposerState,
  saveConfig,
} from "../src/storage";

const localData: Record<string, unknown> = {};
const sessionData: Record<string, unknown> = {};

beforeEach(() => {
  for (const key of Object.keys(localData)) {
    delete localData[key];
  }
  for (const key of Object.keys(sessionData)) {
    delete sessionData[key];
  }

  vi.stubGlobal(
    "chrome",
    {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: localData[key] }),
          set: async (items: Record<string, unknown>) => {
            Object.assign(localData, items);
          },
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
    } as unknown as typeof chrome,
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("composer state storage", () => {
  it("keeps composer state isolated by browser tab", async () => {
    const firstTabState = {
      draft: "first tab draft",
      lastMemoName: "memos/first",
      lastSavedContent: "first tab draft",
      updatedAt: 1,
    };
    const secondTabState = {
      draft: "second tab draft",
      updatedAt: 2,
    };

    await saveComposerState(firstTabState, 101);

    await expect(loadComposerState(202)).resolves.toBeNull();

    await saveComposerState(secondTabState, 202);

    await expect(loadComposerState(101)).resolves.toEqual(firstTabState);
    await expect(loadComposerState(202)).resolves.toEqual(secondTabState);

    await clearComposerState(101);

    await expect(loadComposerState(101)).resolves.toBeNull();
    await expect(loadComposerState(202)).resolves.toEqual(secondTabState);
  });
});

describe("configuration storage", () => {
  it("migrates configurations saved before optional preferences existed", async () => {
    localData["memos.config"] = {
      instanceUrl: "https://memos.example.com",
      apiKey: "token",
      defaultTag: "#inbox",
    };

    await expect(loadConfig()).resolves.toEqual({
      instanceUrl: "https://memos.example.com",
      apiKey: "token",
      defaultTag: "#inbox",
      clipTemplate: DEFAULT_CLIP_TEMPLATE,
      clipOnOpen: false,
      language: "system",
    });
  });

  it("persists an explicit language and normalizes invalid stored values", async () => {
    await saveConfig({
      instanceUrl: "https://memos.example.com",
      apiKey: "token",
      defaultTag: "#inbox",
      clipTemplate: "{{title}} {{url}}",
      clipOnOpen: true,
      language: "en",
    });

    await expect(loadConfig()).resolves.toMatchObject({
      language: "en",
      clipOnOpen: true,
      clipTemplate: "{{title}} {{url}}",
    });

    localData["memos.config"] = {
      instanceUrl: "https://memos.example.com",
      apiKey: "token",
      defaultTag: "#inbox",
      clipTemplate: "   ",
      clipOnOpen: "true",
      language: "fr",
    };

    await expect(loadConfig()).resolves.toMatchObject({
      language: "system",
      clipOnOpen: false,
      clipTemplate: DEFAULT_CLIP_TEMPLATE,
    });
  });
});
