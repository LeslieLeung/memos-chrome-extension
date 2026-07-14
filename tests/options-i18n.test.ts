import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const localData: Record<string, unknown> = {};
const requestPermission = vi.fn().mockResolvedValue(true);

beforeEach(() => {
  for (const key of Object.keys(localData)) {
    delete localData[key];
  }
  requestPermission.mockClear();
  document.body.innerHTML = '<main id="app" class="options-shell"></main>';

  vi.stubGlobal(
    "chrome",
    {
      i18n: {
        getUILanguage: () => "zh-CN",
      },
      storage: {
        local: {
          get: async (key: string) => ({ [key]: localData[key] }),
          set: async (items: Record<string, unknown>) => {
            Object.assign(localData, items);
          },
        },
      },
      permissions: {
        request: requestPermission,
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

async function loadOptionsPage(): Promise<void> {
  await import("../src/options.ts");
  await vi.waitFor(() => {
    expect(document.querySelector<HTMLSelectElement>("#language")).not.toBeNull();
  });
}

describe("options language setting", () => {
  it("follows the system by default and switches languages without Memos credentials", async () => {
    await loadOptionsPage();

    const language = document.querySelector<HTMLSelectElement>("#language");
    const clipOnOpen = document.querySelector<HTMLInputElement>("#clip-on-open");
    expect(language?.value).toBe("system");
    expect(clipOnOpen?.checked).toBe(false);
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(document.title).toBe("Memos 设置");
    expect(document.querySelector("h1")?.textContent).toBe("连接你的 Memos");

    clipOnOpen!.checked = true;
    clipOnOpen!.dispatchEvent(new Event("input", { bubbles: true }));
    language!.value = "en";
    language!.dispatchEvent(new Event("change", { bubbles: true }));

    await vi.waitFor(() => {
      expect(document.documentElement.lang).toBe("en");
      expect(document.querySelector("h1")?.textContent).toBe("Connect your Memos");
      expect(document.querySelector<HTMLInputElement>("#clip-on-open")?.checked).toBe(true);
    });

    expect(localData["memos.config"]).toMatchObject({ language: "en" });
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("saves the default clipping choice with the rest of the configuration", async () => {
    await loadOptionsPage();

    const instanceUrl = document.querySelector<HTMLInputElement>("#instance-url");
    const apiKey = document.querySelector<HTMLInputElement>("#api-key");
    const clipOnOpen = document.querySelector<HTMLInputElement>("#clip-on-open");
    const form = document.querySelector<HTMLFormElement>("#options-form");

    instanceUrl!.value = "https://memos.example.com";
    apiKey!.value = "token";
    clipOnOpen!.checked = true;
    form!.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(localData["memos.config"]).toMatchObject({
        instanceUrl: "https://memos.example.com",
        apiKey: "token",
        clipOnOpen: true,
      });
    });
  });
});
