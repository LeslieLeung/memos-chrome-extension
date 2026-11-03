import { afterEach, describe, expect, it, vi } from "vitest";

import { getBrowserApi } from "../src/lib/browser";
import { initializeI18n, getCurrentLocale } from "../src/lib/i18n";

afterEach(() => {
  vi.unstubAllGlobals();
  initializeI18n("en");
});

describe("browser API selection", () => {
  it("prefers Firefox's promise APIs when both namespaces exist", () => {
    const firefox = { i18n: { getUILanguage: () => "zh-CN" } };
    vi.stubGlobal("browser", firefox);
    vi.stubGlobal("chrome", { i18n: { getUILanguage: () => "en-US" } });

    expect(getBrowserApi()).toBe(firefox);
    initializeI18n("system");
    expect(getCurrentLocale()).toBe("zh-CN");
  });

  it("uses Chrome's MV3 API when browser is unavailable", () => {
    const chromium = { i18n: { getUILanguage: () => "en-US" } };
    vi.stubGlobal("browser", undefined);
    vi.stubGlobal("chrome", chromium);

    expect(getBrowserApi()).toBe(chromium);
    initializeI18n("system");
    expect(getCurrentLocale()).toBe("en");
  });
});
