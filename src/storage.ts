import { getBrowserApi } from "./lib/browser";
import {
  DEFAULT_LANGUAGE_PREFERENCE,
  isLanguagePreference,
} from "./lib/types";
import type {
  ComposerState,
  ExtensionConfig,
} from "./lib/types";
import { DEFAULT_CLIP_TEMPLATE } from "./lib/template";

const CONFIG_KEY = "memos.config";
const COMPOSER_STATE_KEY = "memos.composerState";

const DEFAULT_CONFIG: ExtensionConfig = {
  instanceUrl: "",
  apiKey: "",
  defaultTag: "#inbox",
  clipTemplate: DEFAULT_CLIP_TEMPLATE,
  clipOnOpen: false,
  language: DEFAULT_LANGUAGE_PREFERENCE,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function normalizeConfig(value: unknown): ExtensionConfig {
  if (!isRecord(value)) {
    return { ...DEFAULT_CONFIG };
  }

  return {
    instanceUrl:
      typeof value.instanceUrl === "string" ? value.instanceUrl : "",
    apiKey: typeof value.apiKey === "string" ? value.apiKey : "",
    defaultTag:
      typeof value.defaultTag === "string"
        ? value.defaultTag
        : DEFAULT_CONFIG.defaultTag,
    // Configurations saved before clip templates did not include this field.
    // Fall back to the default template rather than clipping an empty memo.
    clipTemplate:
      typeof value.clipTemplate === "string" && value.clipTemplate.trim()
        ? value.clipTemplate
        : DEFAULT_CONFIG.clipTemplate,
    // Older configurations did not offer automatic clipping. Preserve their
    // manual-composer behavior unless the user explicitly enables it.
    clipOnOpen:
      typeof value.clipOnOpen === "boolean"
        ? value.clipOnOpen
        : DEFAULT_CONFIG.clipOnOpen,
    // Configurations saved before i18n did not include this field. Treat them
    // as the system default rather than forcing an existing user to choose.
    language: isLanguagePreference(value.language)
      ? value.language
      : DEFAULT_CONFIG.language,
  };
}

function normalizeComposerState(value: unknown): ComposerState | null {
  if (
    !isRecord(value) ||
    typeof value.draft !== "string" ||
    typeof value.updatedAt !== "number" ||
    !Number.isFinite(value.updatedAt)
  ) {
    return null;
  }

  const normalized: ComposerState = {
    draft: value.draft,
    updatedAt: value.updatedAt,
  };
  const lastMemoName = asOptionalString(value.lastMemoName);
  const lastSavedContent = asOptionalString(value.lastSavedContent);
  if (lastMemoName !== undefined) {
    normalized.lastMemoName = lastMemoName;
  }
  if (lastSavedContent !== undefined) {
    normalized.lastSavedContent = lastSavedContent;
  }
  return normalized;
}

function composerStateKey(tabId?: number): string {
  return typeof tabId === "number"
    ? `${COMPOSER_STATE_KEY}.${tabId}`
    : COMPOSER_STATE_KEY;
}

export async function loadConfig(): Promise<ExtensionConfig> {
  const result = await getBrowserApi().storage.local.get(CONFIG_KEY);
  return normalizeConfig(result[CONFIG_KEY]);
}

export async function saveConfig(config: ExtensionConfig): Promise<void> {
  await getBrowserApi().storage.local.set({
    [CONFIG_KEY]: normalizeConfig(config),
  });
}

export async function loadComposerState(
  tabId?: number,
): Promise<ComposerState | null> {
  const key = composerStateKey(tabId);
  const result = await getBrowserApi().storage.session.get(key);
  return normalizeComposerState(result[key]);
}

export async function saveComposerState(
  state: ComposerState,
  tabId?: number,
): Promise<void> {
  const normalized = normalizeComposerState(state);
  if (!normalized) {
    throw new TypeError("Invalid composer state");
  }

  await getBrowserApi().storage.session.set({
    [composerStateKey(tabId)]: normalized,
  });
}

export async function clearComposerState(tabId?: number): Promise<void> {
  await getBrowserApi().storage.session.remove(composerStateKey(tabId));
}
