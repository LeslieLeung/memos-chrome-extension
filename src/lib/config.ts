const API_V1_SUFFIX = /\/api\/v1\/?$/i;
const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);

function parseInstanceUrl(input: string): URL {
  const value = input.trim();
  if (!value) {
    throw new TypeError("Instance URL is required.");
  }

  const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(value);
  const candidate = hasScheme ? value : `https://${value}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new TypeError("Instance URL is invalid.");
  }

  if (!SUPPORTED_PROTOCOLS.has(url.protocol)) {
    throw new TypeError("Instance URL must use http or https.");
  }
  if (url.username || url.password) {
    throw new TypeError("Instance URL must not contain credentials.");
  }

  return url;
}

/**
 * Canonicalizes a Memos instance URL while preserving an optional deployment
 * sub-path. A pasted `/api/v1` suffix, query, hash, and trailing slash are removed.
 */
export function normalizeInstanceUrl(input: string): string {
  const url = parseInstanceUrl(input);
  url.search = "";
  url.hash = "";

  const pathWithoutTrailingSlash = url.pathname.replace(/\/+$/, "");
  const instancePath = pathWithoutTrailingSlash.replace(API_V1_SUFFIX, "");
  url.pathname = instancePath || "/";

  return url.toString().replace(/\/$/, "");
}

export function buildApiBaseUrl(instanceUrl: string): string {
  return `${normalizeInstanceUrl(instanceUrl)}/api/v1`;
}

/** Returns the concrete Chrome host-permission match pattern for this instance. */
export function getOriginPattern(instanceUrl: string): string {
  const origin = new URL(normalizeInstanceUrl(instanceUrl)).origin;
  return `${origin}/*`;
}

/**
 * Normalizes the single optional default tag accepted by the MVP. The returned
 * value is either empty or begins with exactly one `#`.
 */
export function normalizeDefaultTag(input: string | null | undefined): string {
  const value = (input ?? "").trim().normalize("NFKC");
  if (!value) {
    return "";
  }

  const name = value.replace(/^#+/, "");
  if (!name) {
    return "";
  }
  if (/\s/u.test(name) || name.includes("#")) {
    throw new TypeError("Default tag must be a single tag without spaces.");
  }

  return `#${name}`;
}
