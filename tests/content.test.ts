import { describe, expect, it } from "vitest";

import {
  buildClipContent,
  cleanTrackingUrl,
  withDefaultTag,
} from "../src/lib/content";

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

describe("buildClipContent", () => {
  it("returns a plain cleaned URL", () => {
    expect(
      buildClipContent({
        title: "  A useful page  ",
        url: "https://example.com/a_(b)?utm_source=test&id=7",
      }),
    ).toBe("https://example.com/a_(b)?id=7");
  });

  it("does not include the page title or Markdown syntax", () => {
    expect(
      buildClipContent({
        title: "A [guide]\nwith \\ examples",
        url: "https://example.com/guide",
      }),
    ).toBe("https://example.com/guide");
  });

  it("rejects restricted pages", () => {
    expect(() =>
      buildClipContent({ title: "Extensions", url: "chrome://extensions" }),
    ).toThrow(/Only http and https/);
  });
});

describe("withDefaultTag", () => {
  it("appends a normalized tag after the memo", () => {
    expect(withDefaultTag("Remember this   ", "inbox")).toBe(
      "Remember this\n\n#inbox",
    );
  });

  it("returns just the tag for blank content", () => {
    expect(withDefaultTag("  ", "#inbox")).toBe("#inbox");
  });

  it("does not append an exact tag that is already present", () => {
    expect(withDefaultTag("Saved in #inbox.", "#inbox")).toBe(
      "Saved in #inbox.",
    );
  });

  it("does not confuse a prefix or nested tag with the exact default tag", () => {
    expect(withDefaultTag("#inbox-later", "#inbox")).toBe(
      "#inbox-later\n\n#inbox",
    );
    expect(withDefaultTag("#inbox/read", "#inbox")).toBe(
      "#inbox/read\n\n#inbox",
    );
  });

  it("leaves content unchanged when no tag is configured", () => {
    expect(withDefaultTag("memo  ", "")).toBe("memo  ");
  });
});
