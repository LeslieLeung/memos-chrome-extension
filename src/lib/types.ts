export const SUPPORTED_LOCALES = ["zh-CN", "en"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * "system" follows Chrome's UI language when available, then the browser
 * language. The explicit values are deliberately limited to the two locales
 * supported by the extension.
 */
export const LANGUAGE_PREFERENCES = [
  "system",
  ...SUPPORTED_LOCALES,
] as const;

export type LanguagePreference = (typeof LANGUAGE_PREFERENCES)[number];

export const DEFAULT_LANGUAGE_PREFERENCE: LanguagePreference = "system";

export function isLanguagePreference(
  value: unknown,
): value is LanguagePreference {
  return (
    typeof value === "string" &&
    (LANGUAGE_PREFERENCES as readonly string[]).includes(value)
  );
}

export interface ExtensionConfig {
  instanceUrl: string;
  apiKey: string;
  defaultTag: string;
  /** Automatically prefill a new, empty composer with the current page URL. */
  clipOnOpen: boolean;
  language: LanguagePreference;
}

export interface ComposerState {
  draft: string;
  lastMemoName?: string;
  lastSavedContent?: string;
  updatedAt: number;
}

export interface ClipData {
  url: string;
  title: string;
}

export type MemoVisibility =
  | "PRIVATE"
  | "PROTECTED"
  | "PUBLIC"
  | "VISIBILITY_UNSPECIFIED";

export type MemoState = "NORMAL" | "ARCHIVED" | "STATE_UNSPECIFIED";

/**
 * The fields used by the extension. Newer Memos servers may return additional
 * fields, which are intentionally allowed so the client remains forwards compatible.
 */
export interface Memo {
  name: string;
  content: string;
  visibility: MemoVisibility;
  state?: MemoState;
  creator?: string;
  createTime?: string;
  updateTime?: string;
  tags?: string[];
  pinned?: boolean;
  [key: string]: unknown;
}
