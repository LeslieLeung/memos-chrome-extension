import "./popup.css";

import {
  buildClipContent,
  extractWebUrls,
} from "./lib/content";
import {
  applyDocumentLocale,
  formatNumber,
  initializeI18n,
  t,
} from "./lib/i18n";
import { MemosApiError, MemosClient } from "./lib/memos-api";
import { DEFAULT_CLIP_TEMPLATE } from "./lib/template";
import type { ComposerState, ExtensionConfig } from "./lib/types";
import type { TranslationKey } from "./lib/i18n";
import {
  clearComposerState,
  loadComposerState,
  loadConfig,
  saveComposerState,
} from "./storage";

interface Elements {
  setupCard: HTMLElement;
  setupButton: HTMLButtonElement;
  settingsButton: HTMLButtonElement;
  composerSection: HTMLElement;
  modeLabel: HTMLElement;
  newMemoButton: HTMLButtonElement;
  content: HTMLTextAreaElement;
  tagHint: HTMLElement;
  characterCount: HTMLElement;
  status: HTMLElement;
  duplicateWarning: HTMLElement;
  duplicateMessage: HTMLElement;
  duplicateCancelButton: HTMLButtonElement;
  duplicateContinueButton: HTMLButtonElement;
  clipButton: HTMLButtonElement;
  submitButton: HTMLButtonElement;
  submitLabel: HTMLElement;
}

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (!appRoot) {
  throw new Error("Popup root element was not found.");
}

const app = appRoot;

let elements: Elements;
let config: ExtensionConfig | null = null;
let composerState: ComposerState = emptyComposerState();
let composerTabId: number | undefined;
let initialPageDetails: Promise<PageDetails> | null = null;
let busy = false;
let saveTimer: number | undefined;
let duplicateDecisionResolver: ((shouldSave: boolean) => void) | undefined;

function renderPage(): void {
  app.innerHTML = `
    <main class="popup-shell">
      <header class="topbar">
        <div class="brand" aria-label="${t("popup.brandName")}">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img">
              <path d="M7.25 3.5h7.55L19 7.7v10.55a2.25 2.25 0 0 1-2.25 2.25h-9.5A2.25 2.25 0 0 1 5 18.25V5.75A2.25 2.25 0 0 1 7.25 3.5Z" />
              <path d="M14.5 3.75V8h4.25M8.5 11h7M8.5 14.5h7M8.5 18h4.25" />
            </svg>
          </span>
          <span>
            <strong>Memos Clipper</strong>
            <small>${t("popup.tagline")}</small>
          </span>
        </div>
        <button class="icon-button" id="settingsButton" type="button" aria-label="${t("popup.openSettings")}" title="${t("popup.settings")}">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1.03 1.56V21H10v-.04A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.57 15 1.7 1.7 0 0 0 3 13.97H3V10h.04A1.7 1.7 0 0 0 4.6 8.97a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.86-2.86.06.06A1.7 1.7 0 0 0 9 4.57 1.7 1.7 0 0 0 10.03 3H14v.04A1.7 1.7 0 0 0 15.06 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.43 9 1.7 1.7 0 0 0 21 10.03V14h-.04A1.7 1.7 0 0 0 19.4 15Z" />
          </svg>
        </button>
      </header>

      <section class="setup-card" id="setupCard" hidden>
        <span class="setup-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 8v4.25M12 16.25h.01"/><circle cx="12" cy="12" r="9"/></svg>
        </span>
        <div>
          <strong>${t("popup.setupTitle")}</strong>
          <p>${t("popup.setupDescription")}</p>
        </div>
        <button id="setupButton" type="button">${t("popup.goToSettings")}</button>
      </section>

      <section class="composer" id="composerSection">
        <div class="composer-heading">
          <span class="mode-label" id="modeLabel"></span>
          <button class="text-button" id="newMemoButton" type="button" hidden>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
            ${t("popup.newMemo")}
          </button>
        </div>
        <label class="sr-only" for="memoContent">${t("popup.memoContent")}</label>
        <textarea
          id="memoContent"
          rows="10"
          maxlength="100000"
          placeholder="${t("popup.memoPlaceholder")}"
          spellcheck="true"
        ></textarea>
        <div class="composer-meta">
          <span id="tagHint"></span>
          <span id="characterCount"></span>
        </div>
      </section>

      <div class="status" id="status" role="status" aria-live="polite" hidden></div>

      <section
        class="duplicate-warning"
        id="duplicateWarning"
        role="status"
        aria-live="polite"
        aria-labelledby="duplicateMessage"
        hidden
      >
        <div class="duplicate-warning-heading">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 8v4.25M12 16.25h.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          <p id="duplicateMessage"></p>
        </div>
        <div class="duplicate-warning-actions">
          <button class="duplicate-action secondary" id="duplicateCancelButton" type="button">
            ${t("popup.cancelDuplicateSave")}
          </button>
          <button class="duplicate-action primary" id="duplicateContinueButton" type="button">
            ${t("popup.continueDuplicateSave")}
          </button>
        </div>
      </section>

      <footer class="actions">
        <button class="button secondary" id="clipButton" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 13.5a4.25 4.25 0 0 0 6.01 0l2-2A4.25 4.25 0 0 0 12 5.5l-1.15 1.15" />
            <path d="M14 10.5a4.25 4.25 0 0 0-6.01 0l-2 2A4.25 4.25 0 0 0 12 18.5l1.15-1.15" />
          </svg>
          ${t("popup.clipCurrentPage")}
        </button>
        <button class="button primary" id="submitButton" type="button">
          <span id="submitLabel"></span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 8 7-8 7"/></svg>
        </button>
      </footer>
    </main>
  `;

  elements = {
    setupCard: getElement<HTMLElement>("setupCard"),
    setupButton: getElement<HTMLButtonElement>("setupButton"),
    settingsButton: getElement<HTMLButtonElement>("settingsButton"),
    composerSection: getElement<HTMLElement>("composerSection"),
    modeLabel: getElement<HTMLElement>("modeLabel"),
    newMemoButton: getElement<HTMLButtonElement>("newMemoButton"),
    content: getElement<HTMLTextAreaElement>("memoContent"),
    tagHint: getElement<HTMLElement>("tagHint"),
    characterCount: getElement<HTMLElement>("characterCount"),
    status: getElement<HTMLElement>("status"),
    duplicateWarning: getElement<HTMLElement>("duplicateWarning"),
    duplicateMessage: getElement<HTMLElement>("duplicateMessage"),
    duplicateCancelButton: getElement<HTMLButtonElement>(
      "duplicateCancelButton",
    ),
    duplicateContinueButton: getElement<HTMLButtonElement>(
      "duplicateContinueButton",
    ),
    clipButton: getElement<HTMLButtonElement>("clipButton"),
    submitButton: getElement<HTMLButtonElement>("submitButton"),
    submitLabel: getElement<HTMLElement>("submitLabel"),
  };

  elements.settingsButton.addEventListener("click", openSettings);
  elements.setupButton.addEventListener("click", openSettings);
  elements.newMemoButton.addEventListener("click", startNewMemo);
  elements.clipButton.addEventListener("click", () => void clipCurrentPage());
  elements.submitButton.addEventListener("click", () => void submitMemo());
  elements.duplicateCancelButton.addEventListener("click", () => {
    resolveDuplicateLinkDecision(false);
  });
  elements.duplicateContinueButton.addEventListener("click", () => {
    resolveDuplicateLinkDecision(true);
  });
  elements.content.addEventListener("input", handleContentInput);
  elements.content.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void submitMemo();
    }
  });

  app.removeAttribute("aria-busy");
}

async function initialize(): Promise<void> {
  try {
    config = await loadConfig();
    initializeI18n(config.language);
  } catch {
    config = null;
    initializeI18n("system");
  }

  applyDocumentLocale("popup.documentTitle");
  renderPage();
  render();

  try {
    const tabId = await getCurrentTabId();
    const storedState = await loadComposerState(tabId);

    composerTabId = tabId;
    composerState = storedState ?? emptyComposerState();

    // Capture the page selection as early as possible: pages that collapse
    // their selection on focus loss would otherwise return nothing by the
    // time the user explicitly clips.
    initialPageDetails = readPageDetails(tabId);

    if (
      storedState === null &&
      config?.clipOnOpen &&
      config.instanceUrl &&
      config.apiKey
    ) {
      await applyDefaultClip();
    }

    render();
    if (config) {
      elements.content.focus();
      elements.content.setSelectionRange(
        elements.content.value.length,
        elements.content.value.length,
      );
    }
  } catch (error) {
    showStatus(readableError(error), "error");
    render();
  }
}

function render(): void {
  const isConfigured = Boolean(config?.instanceUrl && config.apiKey);
  const isEditing = Boolean(composerState.lastMemoName);

  elements.setupCard.hidden = isConfigured;
  elements.composerSection.classList.toggle("is-disabled", !isConfigured);
  elements.content.disabled = !isConfigured || busy;
  elements.clipButton.disabled = !isConfigured || busy;
  elements.submitButton.disabled = !isConfigured || busy;
  elements.newMemoButton.disabled = busy;
  elements.newMemoButton.hidden = !isEditing;

  if (elements.content.value !== composerState.draft) {
    elements.content.value = composerState.draft;
  }

  elements.modeLabel.textContent = isEditing
    ? t("popup.modeEditingMemo")
    : t("popup.modeNewMemo");
  elements.submitLabel.textContent = busy
    ? isEditing
      ? t("popup.savingMemo")
      : t("popup.creatingMemo")
    : isEditing
      ? t("popup.saveChanges")
      : t("popup.createMemo");
  elements.submitButton.classList.toggle("is-loading", busy);

  const tag = config?.defaultTag.trim();
  elements.tagHint.textContent = tag
    ? t("popup.tagHintWithTag", { tag })
    : t("popup.tagHintMarkdown");
  updateCharacterCount();
}

function handleContentInput(): void {
  composerState = {
    ...composerState,
    draft: elements.content.value,
    updatedAt: Date.now(),
  };
  updateCharacterCount();
  hideStatus();

  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    void saveComposerState(composerState, composerTabId);
  }, 180);
}

async function startNewMemo(): Promise<void> {
  if (hasUnsavedChanges() && !window.confirm(t("popup.confirmNewMemo"))) {
    return;
  }

  window.clearTimeout(saveTimer);
  composerState = emptyComposerState();
  await clearComposerState(composerTabId);
  hideStatus();
  render();
  elements.content.focus();
}

async function clipCurrentPage(): Promise<void> {
  if (busy) {
    return;
  }

  try {
    const content = await currentPageClipContent();
    if (
      composerState.draft.trim() &&
      hasUnsavedChanges() &&
      !window.confirm(t("popup.confirmReplaceDraft"))
    ) {
      return;
    }

    composerState = {
      draft: content,
      updatedAt: Date.now(),
    };
    await saveComposerState(composerState, composerTabId);
    showStatus(t("popup.currentPageFilled"), "info");
    render();
    elements.content.focus();
  } catch (error) {
    showStatus(readableError(error), "error");
  }
}

/**
 * Applies the opt-in default only to a fresh composer. It deliberately skips
 * restricted pages and never turns an automatic prefill into a visible error.
 */
async function applyDefaultClip(): Promise<void> {
  try {
    const content = await currentPageClipContent({
      reuseInitialDetails: true,
    });
    composerState = {
      draft: content,
      updatedAt: Date.now(),
    };
    await saveComposerState(composerState, composerTabId);
    showStatus(t("popup.currentPageFilled"), "info");
  } catch {
    // Opening the extension on chrome://, a new tab, or an inaccessible page
    // should still leave a usable blank composer.
  }
}

const EMPTY_PAGE_DETAILS: PageDetails = { selection: "", description: "" };

async function currentPageClipContent(
  options: { reuseInitialDetails?: boolean } = {},
): Promise<string> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https?:\/\//i.test(tab.url)) {
    throw new Error(t("popup.invalidPage"));
  }

  const initial = await (initialPageDetails ??
    Promise.resolve(EMPTY_PAGE_DETAILS));
  const fresh = options.reuseInitialDetails
    ? null
    : await readPageDetails(tab.id);
  const details = fresh
    ? {
        selection: fresh.selection || initial.selection,
        description: fresh.description || initial.description,
      }
    : initial;

  return buildClipContent(
    {
      title: tab.title ?? "",
      url: tab.url,
      content: details.selection,
      description: details.description,
      tag: config?.defaultTag,
    },
    config?.clipTemplate ?? DEFAULT_CLIP_TEMPLATE,
  );
}

interface PageDetails {
  selection: string;
  description: string;
}

/**
 * Runs inside the clipped page. Must stay self-contained: chrome.scripting
 * serializes the function, so it cannot close over popup state.
 */
function collectPageDetails(): PageDetails {
  const selection = window.getSelection()?.toString() ?? "";
  const description = document.querySelector<HTMLMetaElement>(
    'meta[name="description" i], meta[property="og:description" i]',
  )?.content;
  return { selection: selection.trim(), description: description?.trim() ?? "" };
}

/**
 * Reads the page selection and meta description via one-off script injection
 * into every frame, keeping the first non-empty value for each field.
 * Restricted pages (chrome://, the Web Store, missing permission) simply clip
 * without the extras instead of failing the whole clip.
 */
async function readPageDetails(tabId: number | undefined): Promise<PageDetails> {
  if (typeof tabId !== "number" || tabId < 0 || !chrome.scripting?.executeScript) {
    return EMPTY_PAGE_DETAILS;
  }

  try {
    const injections = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: collectPageDetails,
    });

    let selection = "";
    let description = "";
    for (const injection of injections ?? []) {
      const details = injection?.result as Partial<PageDetails> | undefined;
      if (!details || typeof details !== "object") {
        continue;
      }
      if (!selection && typeof details.selection === "string") {
        selection = details.selection;
      }
      if (!description && typeof details.description === "string") {
        description = details.description;
      }
    }
    return { selection, description };
  } catch (error) {
    console.warn("Memos Clipper: failed to read the page details.", error);
    return EMPTY_PAGE_DETAILS;
  }
}

async function submitMemo(): Promise<void> {
  if (busy || !config) {
    return;
  }

  const content = elements.content.value.trim();
  if (!content) {
    showStatus(t("popup.emptyMemo"), "error");
    elements.content.focus();
    return;
  }

  if (composerState.lastMemoName && content === composerState.lastSavedContent) {
    showStatus(t("popup.noChanges"), "info");
    return;
  }

  setBusy(true);
  hideStatus();
  hideDuplicateWarning();

  try {
    const client = new MemosClient(config);
    if (!composerState.lastMemoName) {
      const links = extractWebUrls(content);
      if (links.length > 0) {
        const candidatePages = await Promise.all(
          links.map((link) => client.listMemosContaining(link)),
        );
        const wantedLinks = new Set(links);
        const duplicateNames = new Set(
          candidatePages
            .flat()
            .filter((memo) =>
              extractWebUrls(memo.content).some((link) => wantedLinks.has(link)),
            )
            .map((memo) => memo.name),
        );

        if (duplicateNames.size > 0) {
          const shouldSave = await requestDuplicateLinkDecision(
            duplicateNames.size,
          );
          if (!shouldSave) {
            showStatus(t("popup.duplicateSaveCancelled"), "info");
            return;
          }
        }
      }
    }

    const memo = composerState.lastMemoName
      ? await client.updateMemo(composerState.lastMemoName, content)
      : await client.createMemo(content);

    composerState = {
      draft: memo.content || content,
      lastMemoName: memo.name,
      lastSavedContent: memo.content || content,
      updatedAt: Date.now(),
    };
    await saveComposerState(composerState, composerTabId);
    showStatus(
      composerState.lastMemoName && composerState.lastSavedContent === content
        ? t("popup.savedAndContinue")
        : t("popup.saved"),
      "success",
    );
  } catch (error) {
    showStatus(readableError(error), "error");
  } finally {
    setBusy(false);
  }
}

function requestDuplicateLinkDecision(count: number): Promise<boolean> {
  elements.duplicateMessage.textContent = t("popup.confirmDuplicateLink", {
    count: formatNumber(count),
  });
  elements.duplicateWarning.hidden = false;
  elements.duplicateCancelButton.focus();

  return new Promise((resolve) => {
    duplicateDecisionResolver = resolve;
  });
}

function resolveDuplicateLinkDecision(shouldSave: boolean): void {
  const resolve = duplicateDecisionResolver;
  if (!resolve) {
    return;
  }

  duplicateDecisionResolver = undefined;
  hideDuplicateWarning();
  resolve(shouldSave);
}

function hideDuplicateWarning(): void {
  elements.duplicateWarning.hidden = true;
  elements.duplicateMessage.textContent = "";
}

function setBusy(nextBusy: boolean): void {
  busy = nextBusy;
  render();
}

function hasUnsavedChanges(): boolean {
  if (!composerState.lastMemoName) {
    return Boolean(composerState.draft.trim());
  }

  return composerState.draft.trim() !== composerState.lastSavedContent;
}

function updateCharacterCount(): void {
  elements.characterCount.textContent = t("popup.characterCount", {
    count: formatNumber(elements.content.value.length),
  });
}

function showStatus(
  message: string,
  tone: "success" | "error" | "info",
): void {
  elements.status.textContent = message;
  elements.status.dataset.tone = tone;
  elements.status.hidden = false;
}

function hideStatus(): void {
  elements.status.hidden = true;
  elements.status.textContent = "";
  delete elements.status.dataset.tone;
}

function openSettings(): void {
  void chrome.runtime.openOptionsPage();
}

function readableError(error: unknown): string {
  if (error instanceof MemosApiError) {
    return t(`api.error.${error.code}` as TranslationKey);
  }
  if (error instanceof Error && error.message === t("popup.invalidPage")) {
    return error.message;
  }
  return t("popup.operationFailed");
}

function emptyComposerState(): ComposerState {
  return { draft: "", updatedAt: Date.now() };
}

async function getCurrentTabId(): Promise<number | undefined> {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    return tab?.id;
  } catch {
    return undefined;
  }
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing popup element: ${id}`);
  }
  return element as T;
}

void initialize();
