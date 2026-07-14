import { describe, expect, it } from "vitest";

import {
  buildApiBaseUrl,
  getOriginPattern,
  normalizeDefaultTag,
  normalizeInstanceUrl,
} from "../src/lib/config";

describe("normalizeInstanceUrl", () => {
  it("adds https and removes trailing slashes", () => {
    expect(normalizeInstanceUrl("  memos.example.com///  ")).toBe(
      "https://memos.example.com",
    );
  });

  it("removes a pasted API suffix while preserving a deployment path", () => {
    expect(
      normalizeInstanceUrl(
        "http://localhost:5230/apps/memos/api/v1/?ignored=yes#section",
      ),
    ).toBe("http://localhost:5230/apps/memos");
  });

  it("rejects unsupported schemes and embedded credentials", () => {
    expect(() => normalizeInstanceUrl("ftp://memos.example.com")).toThrow(
      /http or https/,
    );
    expect(() =>
      normalizeInstanceUrl("https://name:secret@memos.example.com"),
    ).toThrow(/credentials/);
  });
});

describe("instance URL derivations", () => {
  it("builds the API base once", () => {
    expect(buildApiBaseUrl("https://memos.example.com/api/v1/")).toBe(
      "https://memos.example.com/api/v1",
    );
  });

  it("returns a concrete origin permission without an instance path", () => {
    expect(getOriginPattern("http://localhost:5230/apps/memos")).toBe(
      "http://localhost:5230/*",
    );
  });
});

describe("normalizeDefaultTag", () => {
  it.each([
    ["", ""],
    ["inbox", "#inbox"],
    [" #inbox ", "#inbox"],
    ["###inbox", "#inbox"],
    ["＃收件箱", "#收件箱"],
    ["project/notes", "#project/notes"],
  ])("normalizes %j to %j", (input, expected) => {
    expect(normalizeDefaultTag(input)).toBe(expected);
  });

  it("rejects multiple or malformed tags", () => {
    expect(() => normalizeDefaultTag("in box")).toThrow(/single tag/);
    expect(() => normalizeDefaultTag("#inbox#later")).toThrow(/single tag/);
  });
});
