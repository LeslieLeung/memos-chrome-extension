import { normalizeDefaultTag } from "./config";
import { renderClipTemplate } from "./template";
import type { ClipData } from "./types";

const TRACKING_PARAMETERS = new Set([
  "_ga",
  "_gl",
  "_hsenc",
  "_hsmi",
  "dclid",
  "fbclid",
  "gclid",
  "gbraid",
  "hsctatracking",
  "igshid",
  "mc_cid",
  "mc_eid",
  "mkt_tok",
  "msclkid",
  "oly_anon_id",
  "oly_enc_id",
  "rb_clickid",
  "ref_src",
  "s_cid",
  "si",
  "twclid",
  "vero_conv",
  "vero_id",
  "wbraid",
  "wickedid",
  "yclid",
]);

const WEB_URL_PATTERN = /https?:\/\/[^\s<>"'`]+/giu;

function isTrackingParameter(name: string): boolean {
  const normalized = name.toLowerCase();
  return normalized.startsWith("utm_") || TRACKING_PARAMETERS.has(normalized);
}

/**
 * Removes known tracking query parameters without touching business parameters,
 * their order, or the page fragment. Invalid and non-web URLs are returned intact.
 */
export function cleanTrackingUrl(input: string): string {
  const value = input.trim();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return value;
  }

  // Browser tab URLs normally have no user info, but never put it into a memo.
  url.username = "";
  url.password = "";

  const keysToDelete = new Set<string>();
  for (const key of url.searchParams.keys()) {
    if (isTrackingParameter(key)) {
      keysToDelete.add(key);
    }
  }
  for (const key of keysToDelete) {
    url.searchParams.delete(key);
  }

  return url.toString();
}

export function buildClipContent(data: ClipData, template: string): string {
  const cleanedUrl = cleanTrackingUrl(data.url);

  let parsed: URL;
  try {
    parsed = new URL(cleanedUrl);
  } catch {
    throw new TypeError("The current page does not have a valid web URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError("Only http and https pages can be clipped.");
  }

  return renderClipTemplate(template, {
    content: data.content?.trim() ?? "",
    title: data.title.trim(),
    url: cleanedUrl,
    description: data.description?.trim() ?? "",
    tag: safeDefaultTag(data.tag),
  });
}

/** Normalizes the configured default tag; invalid values render as empty. */
function safeDefaultTag(value: string | undefined): string {
  try {
    return normalizeDefaultTag(value ?? "");
  } catch {
    return "";
  }
}

function trimUnbalancedClosingDelimiters(value: string): string {
  let result = value.replace(/[.,!?;:]+$/u, "");
  const delimiterPairs = [
    ["(", ")"],
    ["[", "]"],
    ["{", "}"],
  ] as const;

  for (const [opening, closing] of delimiterPairs) {
    const openingCount = [...result].filter((character) => character === opening).length;
    let closingCount = [...result].filter((character) => character === closing).length;
    while (result.endsWith(closing) && closingCount > openingCount) {
      result = result.slice(0, -1);
      closingCount -= 1;
    }
  }

  return result;
}

/** Finds unique web links and normalizes them in the same way as clipped URLs. */
export function extractWebUrls(content: string): string[] {
  const urls = new Set<string>();

  for (const match of content.matchAll(WEB_URL_PATTERN)) {
    const candidate = trimUnbalancedClosingDelimiters(match[0]);
    try {
      const url = new URL(candidate);
      if (url.protocol === "http:" || url.protocol === "https:") {
        urls.add(cleanTrackingUrl(url.toString()));
      }
    } catch {
      // Ignore URL-like text that is not a valid web URL.
    }
  }

  return [...urls];
}
