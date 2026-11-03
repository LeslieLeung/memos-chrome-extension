import { getBrowserApi } from "./browser";
import {
  DEFAULT_LANGUAGE_PREFERENCE,
  SUPPORTED_LOCALES,
  isLanguagePreference,
} from "./types";
import type { LanguagePreference, SupportedLocale } from "./types";

export type TranslationValues = Record<string, number | string>;

const en = {
  "extension.actionTitle": "Save to Memos",
  "popup.documentTitle": "Memos Clipper",
  "popup.brandName": "Memos Clipper",
  "popup.tagline": "Capture a thought in your own Memos",
  "popup.openSettings": "Open settings",
  "popup.settings": "Settings",
  "popup.setupTitle": "Connect your Memos first",
  "popup.setupDescription":
    "Set your instance URL and Access Token to start creating memos.",
  "popup.goToSettings": "Go to settings",
  "popup.modeNewMemo": "New memo",
  "popup.modeEditingMemo": "Editing the memo you just created",
  "popup.newMemo": "New memo",
  "popup.memoContent": "Memo content",
  "popup.memoPlaceholder": "What's on your mind? Markdown is supported…",
  "popup.characterCount": "{{count}} characters",
  "popup.tagHintWithTag": "{{tag}} is inserted by the clip template",
  "popup.tagHintMarkdown": "Markdown",
  "popup.clipCurrentPage": "Clip this page",
  "popup.createMemo": "Create memo",
  "popup.saveChanges": "Save changes",
  "popup.creatingMemo": "Creating…",
  "popup.savingMemo": "Saving…",
  "popup.confirmNewMemo":
    "Your current changes have not been saved. Start a new memo anyway?",
  "popup.invalidPage": "This page cannot be clipped. Open a regular web page and try again.",
  "popup.confirmReplaceDraft": "Replace the content in the editor with this page?",
  "popup.currentPageFilled": "The current page was added. Review it before creating the memo.",
  "popup.confirmDuplicateLink":
    "Found {{count}} existing memo(s) with the same link. Save another one anyway?",
  "popup.cancelDuplicateSave": "Cancel save",
  "popup.continueDuplicateSave": "Save anyway",
  "popup.duplicateSaveCancelled": "Not saved. You can keep editing this memo.",
  "popup.emptyMemo": "Write something before creating a memo.",
  "popup.noChanges": "There are no changes to save.",
  "popup.savedAndContinue": "Saved to Memos. You can keep editing this memo.",
  "popup.saved": "Saved to Memos.",
  "popup.operationFailed": "The operation failed. Please try again later.",

  "options.documentTitle": "Memos Settings",
  "options.heading": "Connect your Memos",
  "options.subtitle":
    "Your configuration stays in this browser and is never sent to another service.",
  "options.instanceUrl": "Instance URL",
  "options.instanceUrlHint":
    "Enter the instance root URL; you do not need to add /api/v1.",
  "options.accessToken": "Access Token",
  "options.accessTokenPlaceholder": "Paste your Memos Access Token",
  "options.accessTokenHint":
    "The token is stored only in local extension storage and is never logged.",
  "options.defaultTag": "Default tag",
  "options.optional": "Optional",
  "options.defaultTagHint":
    "Inserted wherever {{tag}} appears in the clip template.",
  "options.clipOnOpen": "Default behavior",
  "options.clipOnOpenEnabled": "Clip the current page when opening the extension",
  "options.clipOnOpenHint":
    "Automatically renders the clip template into a new memo. Existing drafts are never replaced.",
  "options.clipTemplate": "Clip template",
  "options.clipTemplateHint":
    "Rendered when you clip a page. Available variables: {{vars}}.",
  "options.templateVariables": "Insert variable",
  "options.templateReset": "Reset to default",
  "options.templatePreview": "Live preview",
  "options.templateSampleContent":
    "A useful archive is less about collecting everything and more about making important fragments easy to return to.",
  "options.templateSampleTitle": "Designing a personal archive",
  "options.templateSampleDescription":
    "A practical guide to keeping useful ideas close.",
  "options.language": "Language",
  "options.languageHint":
    "System follows your browser's language. Your choice applies to this extension only.",
  "options.languageSystem": "System default",
  "options.languageChinese": "中文",
  "options.languageEnglish": "English",
  "options.saveSettings": "Save settings",
  "options.savingSettings": "Saving…",
  "options.readingSettings": "Reading settings…",
  "options.couldNotReadSettings": "Could not read settings",
  "options.invalidInstanceUrl": "The instance URL is invalid. Use an http:// or https:// URL.",
  "options.invalidDefaultTag": "The default tag cannot contain spaces.",
  "options.apiKeyRequired": "Enter an API key.",
  "options.checkSettings": "Check your settings.",
  "options.requestingPermission": "Requesting permission to access the instance…",
  "options.permissionDenied": "Permission to access this instance was not granted. Settings were not saved.",
  "options.saving": "Saving…",
  "options.savedOldPermission":
    "Settings were saved, but the previous instance permission could not be removed.",
  "options.saved": "Settings saved.",
  "options.saveFailed": "Could not save settings. Please try again later.",
  "options.unsavedChanges": "You have unsaved changes.",
  "api.error.INVALID_REQUEST":
    "The request content is invalid. Check the memo content and try again.",
  "api.error.UNAUTHORIZED":
    "The API key is invalid or expired. Update it in Settings.",
  "api.error.FORBIDDEN":
    "This API key does not have permission to perform this action.",
  "api.error.NOT_FOUND": "The Memos instance or memo could not be found.",
  "api.error.CONFLICT": "The memo changed. Refresh and try again.",
  "api.error.RATE_LIMITED": "Too many requests. Please try again later.",
  "api.error.SERVER_ERROR": "The Memos service has a temporary error. Please try again later.",
  "api.error.HTTP_ERROR": "The Memos request failed. Please try again later.",
  "api.error.NETWORK_ERROR":
    "Could not connect to the Memos instance. Check the address and your network.",
  "api.error.ABORTED": "The request was cancelled.",
  "api.error.INVALID_RESPONSE":
    "Memos returned unrecognizable data. Check the server version.",
} as const;

export type TranslationKey = keyof typeof en;

const zhCN: Record<TranslationKey, string> = {
  "extension.actionTitle": "保存到 Memos",
  "popup.documentTitle": "Memos 剪藏",
  "popup.brandName": "Memos Clipper",
  "popup.tagline": "随手记下，回到自己的 Memos",
  "popup.openSettings": "打开设置",
  "popup.settings": "设置",
  "popup.setupTitle": "先连接你的 Memos",
  "popup.setupDescription": "设置实例地址和 Access Token 后即可创建。",
  "popup.goToSettings": "去设置",
  "popup.modeNewMemo": "新 Memo",
  "popup.modeEditingMemo": "编辑刚创建的 Memo",
  "popup.newMemo": "新建",
  "popup.memoContent": "Memo 内容",
  "popup.memoPlaceholder": "现在想到什么？支持 Markdown…",
  "popup.characterCount": "{{count}} 字",
  "popup.tagHintWithTag": "剪藏时通过模板插入 {{tag}}",
  "popup.tagHintMarkdown": "Markdown",
  "popup.clipCurrentPage": "剪藏此页",
  "popup.createMemo": "创建 Memo",
  "popup.saveChanges": "保存修改",
  "popup.creatingMemo": "正在创建…",
  "popup.savingMemo": "正在保存…",
  "popup.confirmNewMemo": "当前修改还没有保存。确定开始一条新 Memo 吗？",
  "popup.invalidPage": "当前页面无法剪藏，请打开一个普通网页后再试。",
  "popup.confirmReplaceDraft": "用当前网页替换编辑器里的内容吗？",
  "popup.currentPageFilled": "已填入当前网页，检查内容后即可创建。",
  "popup.confirmDuplicateLink":
    "发现 {{count}} 条已有 Memo 包含同一链接，仍要继续保存吗？",
  "popup.cancelDuplicateSave": "取消保存",
  "popup.continueDuplicateSave": "仍然保存",
  "popup.duplicateSaveCancelled": "已取消保存，你可以继续编辑。",
  "popup.emptyMemo": "先写点内容，再创建 Memo。",
  "popup.noChanges": "内容没有变化，无需重复保存。",
  "popup.savedAndContinue": "已保存到 Memos。你可以继续修改这条 Memo。",
  "popup.saved": "已保存到 Memos。",
  "popup.operationFailed": "操作失败，请稍后再试。",

  "options.documentTitle": "Memos 设置",
  "options.heading": "连接你的 Memos",
  "options.subtitle": "配置只保存在这台浏览器中，不会发送到其他服务。",
  "options.instanceUrl": "实例地址",
  "options.instanceUrlHint": "填写实例根地址即可，不需要加 /api/v1。",
  "options.accessToken": "Access Token",
  "options.accessTokenPlaceholder": "粘贴 Memos Access Token",
  "options.accessTokenHint":
    "Token 仅存入本地扩展存储，不会写入日志。",
  "options.defaultTag": "默认标签",
  "options.optional": "可选",
  "options.defaultTagHint": "剪藏时替换剪藏模板中的 {{tag}} 变量。",
  "options.clipOnOpen": "默认行为",
  "options.clipOnOpenEnabled": "打开扩展时默认剪藏当前网页",
  "options.clipOnOpenHint": "打开时自动按剪藏模板填入新 Memo，不会覆盖已有草稿。",
  "options.clipTemplate": "剪藏模板",
  "options.clipTemplateHint": "剪藏网页时按此模板生成 Memo 内容。可用变量：{{vars}}。",
  "options.templateVariables": "插入变量",
  "options.templateReset": "恢复默认",
  "options.templatePreview": "实时预览",
  "options.templateSampleContent":
    "一份有用的档案，不在于收集一切，而在于让重要的片段随时可以回访。",
  "options.templateSampleTitle": "设计一份个人档案",
  "options.templateSampleDescription": "一份让有用想法触手可及的实用指南。",
  "options.language": "语言",
  "options.languageHint": "系统默认跟随浏览器语言；你的选择只应用于此扩展。",
  "options.languageSystem": "跟随系统",
  "options.languageChinese": "中文",
  "options.languageEnglish": "English",
  "options.saveSettings": "保存设置",
  "options.savingSettings": "保存中…",
  "options.readingSettings": "正在读取设置…",
  "options.couldNotReadSettings": "无法读取设置",
  "options.invalidInstanceUrl": "实例地址无效，请使用 http:// 或 https:// 地址。",
  "options.invalidDefaultTag": "默认标签不能包含空格。",
  "options.apiKeyRequired": "请输入 API key。",
  "options.checkSettings": "请检查设置。",
  "options.requestingPermission": "正在申请实例访问权限…",
  "options.permissionDenied": "未获得该实例的访问权限，设置尚未保存。",
  "options.saving": "正在保存…",
  "options.savedOldPermission": "设置已保存，但旧实例权限未能移除。",
  "options.saved": "设置已保存。",
  "options.saveFailed": "保存失败，请稍后重试。",
  "options.unsavedChanges": "有尚未保存的更改。",
  "api.error.INVALID_REQUEST": "请求内容无效，请检查 Memo 内容后重试。",
  "api.error.UNAUTHORIZED": "API key 无效或已过期，请在设置中更新。",
  "api.error.FORBIDDEN": "当前 API key 没有执行此操作的权限。",
  "api.error.NOT_FOUND": "找不到 Memos 实例或这条 Memo。",
  "api.error.CONFLICT": "Memo 已发生变化，请刷新后重试。",
  "api.error.RATE_LIMITED": "请求过于频繁，请稍后再试。",
  "api.error.SERVER_ERROR": "Memos 服务暂时出错，请稍后再试。",
  "api.error.HTTP_ERROR": "Memos 请求失败，请稍后再试。",
  "api.error.NETWORK_ERROR": "无法连接 Memos 实例，请检查地址和网络。",
  "api.error.ABORTED": "请求已取消。",
  "api.error.INVALID_RESPONSE": "Memos 返回了无法识别的数据，请检查服务版本。",
};

const translations: Record<SupportedLocale, Record<TranslationKey, string>> = {
  en,
  "zh-CN": zhCN,
};

let currentLocale: SupportedLocale = resolveLocale(DEFAULT_LANGUAGE_PREFERENCE);

function getSystemLanguages(): readonly string[] {
  try {
    const api = getBrowserApi();
    if (typeof api.i18n?.getUILanguage === "function") {
      const browserLanguage = api.i18n.getUILanguage();
      if (browserLanguage) {
        return [browserLanguage];
      }
    }
  } catch {
    // The extension i18n API is unavailable in unit tests and non-extension contexts.
  }

  if (typeof navigator === "undefined") {
    return [];
  }

  return navigator.languages?.length
    ? navigator.languages
    : navigator.language
      ? [navigator.language]
      : [];
}

/** Resolves explicit preferences or a list of system language candidates. */
export function resolveLocale(
  preference: LanguagePreference,
  systemLanguages: readonly string[] = getSystemLanguages(),
): SupportedLocale {
  if (preference === "zh-CN" || preference === "en") {
    return preference;
  }

  for (const language of systemLanguages) {
    const normalizedLanguage = language.toLowerCase();
    if (normalizedLanguage.startsWith("zh")) {
      return "zh-CN";
    }
    if (normalizedLanguage.startsWith("en")) {
      return "en";
    }
  }

  return "en";
}

/** Initializes the in-memory locale after the saved configuration is loaded. */
export function initializeI18n(
  preference: LanguagePreference,
): SupportedLocale {
  return setLanguagePreference(preference);
}

/** Changes the active locale. Persist the preference separately with saveConfig. */
export function setLanguagePreference(
  preference: LanguagePreference,
): SupportedLocale {
  currentLocale = resolveLocale(
    isLanguagePreference(preference)
      ? preference
      : DEFAULT_LANGUAGE_PREFERENCE,
  );
  return currentLocale;
}

export function getCurrentLocale(): SupportedLocale {
  return currentLocale;
}

/** Formats a user-facing number with the active locale's grouping rules. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(currentLocale).format(value);
}

/** Looks up a translated string and replaces `{{placeholder}}` values. */
export function t(key: TranslationKey, values: TranslationValues = {}): string {
  return translations[currentLocale][key].replace(
    /\{\{([\w.-]+)\}\}/gu,
    (_match, name: string) => String(values[name] ?? ""),
  );
}

/** Synchronizes the document language and, optionally, its title. */
export function applyDocumentLocale(titleKey?: TranslationKey): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = currentLocale;
  if (titleKey) {
    document.title = t(titleKey);
  }
}

export { SUPPORTED_LOCALES };
