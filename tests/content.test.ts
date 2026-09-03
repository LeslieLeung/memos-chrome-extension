import { describe, expect, it } from "vitest";

import {
  buildClipContent,
  cleanTrackingUrl,
  extractWebUrls,
} from "../src/lib/content";
import { DEFAULT_CLIP_TEMPLATE } from "../src/lib/template";

describe("cleanTrackingUrl", () => {
  it("removes known trackers case-insensitively and preserves business data", () => {
    expect(
      cleanTrackingUrl(
        "https://example.com/read?id=42&utm_source=newsletter&FBCLID=abc&view=full#comments",
      ),
    ).toBe("https://example.com/read?id=42&view=full#comments");
  });

  it("removes all UTM variants and repeated tracker values", () => {
    expect(
      cleanTrackingUrl(
        "https://example.com/?utm_medium=a&utm_medium=b&UtM_Custom=c&keep=yes",
      ),
    ).toBe("https://example.com/?keep=yes");
  });

  it("does not alter invalid or non-web URLs", () => {
    expect(cleanTrackingUrl(" not a URL ")).toBe("not a URL");
    expect(cleanTrackingUrl("chrome://extensions/?utm_source=x")).toBe(
      "chrome://extensions/?utm_source=x",
    );
  });

  it("does not leak URL credentials", () => {
    expect(cleanTrackingUrl("https://name:secret@example.com/a?ok=1")).toBe(
      "https://example.com/a?ok=1",
    );
  });
});

describe("extractWebUrls", () => {
  it("extracts, cleans, and de-duplicates web links", () => {
    expect(
      extractWebUrls(
        "Read https://example.com/a?id=7&utm_source=test, then https://example.com/a?id=7.",
      ),
    ).toEqual(["https://example.com/a?id=7"]);
  });

  it("handles Markdown punctuation without truncating balanced URL delimiters", () => {
    expect(
      extractWebUrls(
        "[guide](https://example.com/a_(b)) and <https://example.com/other>.",
      ),
    ).toEqual([
      "https://example.com/a_(b)",
      "https://example.com/other",
    ]);
  });

  it("ignores non-web and invalid URL-like text", () => {
    expect(extractWebUrls("chrome://extensions and https://[invalid")).toEqual([]);
  });
});

describe("buildClipContent", () => {
  const page = {
    title: "  A useful page  ",
    url: "https://example.com/a_(b)?utm_source=test&id=7",
    content: "Remember this",
    description: "A practical guide.",
    tag: "#inbox",
  };

  it("renders the default template into Markdown with the cleaned URL", () => {
    expect(buildClipContent(page, DEFAULT_CLIP_TEMPLATE)).toBe(
      "Remember this\n\n[A useful page](https://example.com/a_(b)?id=7)\n\n#inbox",
    );
  });

  it("supports plain-URL templates for the legacy format", () => {
    expect(buildClipContent(page, "{{url}}")).toBe(
      "https://example.com/a_(b)?id=7",
    );
  });

  it("omits missing selection, description, and tag", () => {
    expect(
      buildClipContent(
        { title: "Guide", url: "https://example.com/guide" },
        DEFAULT_CLIP_TEMPLATE,
      ),
    ).toBe("[Guide](https://example.com/guide)");
  });

  it("normalizes the tag rendered for {{tag}}", () => {
    expect(buildClipContent({ ...page, tag: "inbox" }, "{{url}} {{tag}}")).toBe(
      "https://example.com/a_(b)?id=7 #inbox",
    );
    expect(
      buildClipContent({ ...page, tag: "two words" }, "{{url}} {{tag}}"),
    ).toBe("https://example.com/a_(b)?id=7");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(buildClipContent(page, "{{url}} by {{author}}")).toBe(
      "https://example.com/a_(b)?id=7 by {{author}}",
    );
  });

  it("rejects restricted pages", () => {
    expect(() =>
      buildClipContent(
        { title: "Extensions", url: "chrome://extensions" },
        DEFAULT_CLIP_TEMPLATE,
      ),
    ).toThrow(/Only http and https/);
  });
});
