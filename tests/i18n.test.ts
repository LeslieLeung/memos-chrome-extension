import { afterEach, describe, expect, it } from "vitest";

import {
  applyDocumentLocale,
  formatNumber,
  getCurrentLocale,
  initializeI18n,
  resolveLocale,
  setLanguagePreference,
  t,
} from "../src/lib/i18n";

afterEach(() => {
  initializeI18n("en");
  document.documentElement.lang = "";
  document.title = "";
});

describe("locale resolution", () => {
  it("uses Chinese for Chinese system languages and English otherwise", () => {
    expect(resolveLocale("system", ["zh-Hans-CN", "en-US"])).toBe("zh-CN");
    expect(resolveLocale("system", ["en-US", "zh-CN"])).toBe("en");
    expect(resolveLocale("system", ["ja-JP"])).toBe("en");
  });

  it("honors an explicit language preference over the system language", () => {
    expect(resolveLocale("en", ["zh-CN"])).toBe("en");
    expect(resolveLocale("zh-CN", ["en-US"])).toBe("zh-CN");
  });
});

describe("translations", () => {
  it("switches the active locale and interpolates values", () => {
    initializeI18n("zh-CN");
    expect(getCurrentLocale()).toBe("zh-CN");
    expect(t("popup.characterCount", { count: 42 })).toBe("42 字");

    setLanguagePreference("en");
    expect(t("popup.characterCount", { count: 42 })).toBe("42 characters");
    expect(formatNumber(12345)).toBe("12,345");
  });

  it("updates the document language and translated title", () => {
    initializeI18n("zh-CN");
    applyDocumentLocale("options.documentTitle");

    expect(document.documentElement.lang).toBe("zh-CN");
    expect(document.title).toBe("Memos 设置");
  });

  it("includes localized Memos API errors", () => {
    initializeI18n("en");
    expect(t("api.error.UNAUTHORIZED")).toMatch(/invalid or expired/i);

    setLanguagePreference("zh-CN");
    expect(t("api.error.UNAUTHORIZED")).toBe(
      "API key 无效或已过期，请在设置中更新。",
    );
  });
});
