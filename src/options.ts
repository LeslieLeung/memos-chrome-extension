import "./options.css";

import {
  getOriginPattern,
  normalizeDefaultTag as normalizeConfigTag,
  normalizeInstanceUrl as normalizeConfigUrl,
} from "./lib/config";
import {
  applyDocumentLocale,
  initializeI18n,
  setLanguagePreference,
  t,
} from "./lib/i18n";
import {
  DEFAULT_CLIP_TEMPLATE,
  isTemplateVariable,
  renderClipTemplate,
  templateToken,
} from "./lib/template";
import type { TemplateVariable, TemplateVariables } from "./lib/template";
import { isLanguagePreference } from "./lib/types";
import type { ExtensionConfig, LanguagePreference } from "./lib/types";
import { loadConfig, saveConfig } from "./storage";

type StatusKind = "idle" | "info" | "success" | "error" | "warning";

interface FormDraft {
  instanceUrl: string;
  apiKey: string;
  defaultTag: string;
  clipTemplate: string;
  clipOnOpen: boolean;
}

interface Elements {
  form: HTMLFormElement;
  languageInput: HTMLSelectElement;
  instanceUrlInput: HTMLInputElement;
  apiKeyInput: HTMLInputElement;
  defaultTagInput: HTMLInputElement;
  clipTemplateInput: HTMLTextAreaElement;
  templateResetButton: HTMLButtonElement;
  templatePreviewOutput: HTMLElement;
  templateVariableButtons: HTMLButtonElement[];
  clipOnOpenInput: HTMLInputElement;
  saveButton: HTMLButtonElement;
  status: HTMLElement;
}

const appRoot = document.querySelector<HTMLElement>("#app");

if (!appRoot) {
  throw new Error("Options root element was not found.");
}

const app = appRoot;

let elements: Elements;
let currentConfig: ExtensionConfig | null = null;
let isSaving = false;
let isChangingLanguage = false;

export function normalizeInstanceUrl(rawValue: string): string {
  try {
    return normalizeConfigUrl(rawValue);
  } catch {
    throw new Error(t("options.invalidInstanceUrl"));
  }
}

export function originPermission(instanceUrl: string): string {
  return getOriginPattern(instanceUrl);
}

function normalizeDefaultTag(rawValue: string): string {
  try {
    return normalizeConfigTag(rawValue);
  } catch {
    throw new Error(t("options.invalidDefaultTag"));
  }
}

function normalizeClipTemplate(rawValue: string): string {
  const value = rawValue.trim();
  return value || DEFAULT_CLIP_TEMPLATE;
}

/** Sample data for the template preview; mirrors a clipped article. */
function templateSampleVariables(): TemplateVariables {
  return {
    content: t("options.templateSampleContent"),
    title: t("options.templateSampleTitle"),
    url: "https://example.com/designing-a-personal-archive?utm_source=demo",
    description: t("options.templateSampleDescription"),
    tag: sampleTag(),
  };
}

/** Previews the configured default tag, falling back to a readable sample. */
function sampleTag(): string {
  try {
    return normalizeConfigTag(elements.defaultTagInput.value) || "#inbox";
  } catch {
    return "#inbox";
  }
}

function updateTemplatePreview(): void {
  elements.templatePreviewOutput.textContent = renderClipTemplate(
    elements.clipTemplateInput.value,
    templateSampleVariables(),
  );
}

function insertTemplateVariable(variable: TemplateVariable): void {
  const input = elements.clipTemplateInput;
  const token = templateToken(variable);
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;

  input.value = `${input.value.slice(0, start)}${token}${input.value.slice(end)}`;
  const caret = start + token.length;
  input.setSelectionRange(caret, caret);
  input.focus();
  updateTemplatePreview();
  handleFormInput();
}

function resetTemplate(): void {
  elements.clipTemplateInput.value = DEFAULT_CLIP_TEMPLATE;
  updateTemplatePreview();
  handleFormInput();
  elements.clipTemplateInput.focus();
}

function renderPage(draft?: FormDraft): void {
  app.innerHTML = `
    <header>
      <div class="brand-row">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M7.25 3.5h7.55L19 7.7v10.55a2.25 2.25 0 0 1-2.25 2.25h-9.5A2.25 2.25 0 0 1 5 18.25V5.75A2.25 2.25 0 0 1 7.25 3.5Z" />
            <path d="M14.5 3.75V8h4.25M8.5 11h7M8.5 14.5h7M8.5 18h4.25" />
          </svg>
        </span>
        <span>Memos Clipper</span>
      </div>
      <h1>${t("options.heading")}</h1>
      <p class="subtitle">${t("options.subtitle")}</p>
    </header>

    <form id="options-form" autocomplete="off">
      <div class="field">
        <label for="language">${t("options.language")}</label>
        <select id="language" name="language" aria-describedby="language-hint">
          <option value="system">${t("options.languageSystem")}</option>
          <option value="zh-CN">${t("options.languageChinese")}</option>
          <option value="en">${t("options.languageEnglish")}</option>
        </select>
        <p class="hint" id="language-hint">${t("options.languageHint")}</p>
      </div>

      <div class="field">
        <label for="instance-url">${t("options.instanceUrl")}</label>
        <input
          id="instance-url"
          name="instanceUrl"
          type="url"
          inputmode="url"
          placeholder="https://memos.example.com"
          aria-describedby="instance-hint"
          required
        />
        <p class="hint" id="instance-hint">${t("options.instanceUrlHint")}</p>
      </div>

      <div class="field">
        <label for="api-key">${t("options.accessToken")}</label>
        <input
          id="api-key"
          name="apiKey"
          type="password"
          placeholder="${t("options.accessTokenPlaceholder")}"
          aria-describedby="token-hint"
          required
        />
        <p class="hint" id="token-hint">${t("options.accessTokenHint")}</p>
      </div>

      <div class="field">
        <label for="default-tag">${t("options.defaultTag")} <span class="optional">${t("options.optional")}</span></label>
        <input
          id="default-tag"
          name="defaultTag"
          type="text"
          placeholder="#inbox"
          aria-describedby="tag-hint"
        />
        <p class="hint" id="tag-hint">
          ${t("options.defaultTagHint", { tag: "{{tag}}" })}
        </p>
      </div>

      <div class="field">
        <span class="field-label">${t("options.clipOnOpen")}</span>
        <label class="checkbox-control" for="clip-on-open">
          <input
            id="clip-on-open"
            name="clipOnOpen"
            type="checkbox"
            aria-describedby="clip-on-open-hint"
          />
          <span>${t("options.clipOnOpenEnabled")}</span>
        </label>
        <p class="hint" id="clip-on-open-hint">${t("options.clipOnOpenHint")}</p>
      </div>

      <div class="field">
        <label for="clip-template">${t("options.clipTemplate")}</label>
        <div class="template-chips" role="group" aria-label="${t("options.templateVariables")}">
          <button type="button" class="chip" data-template-variable="content">{{content}}</button>
          <button type="button" class="chip" data-template-variable="title">{{title}}</button>
          <button type="button" class="chip" data-template-variable="url">{{url}}</button>
          <button type="button" class="chip" data-template-variable="description">{{description}}</button>
          <button type="button" class="chip" data-template-variable="tag">{{tag}}</button>
        </div>
        <textarea
          id="clip-template"
          name="clipTemplate"
          rows="4"
          spellcheck="false"
          aria-describedby="clip-template-hint"
        ></textarea>
        <p class="hint" id="clip-template-hint">
          ${t("options.clipTemplateHint", {
            vars: "{{content}}, {{title}}, {{url}}, {{description}}, {{tag}}",
          })}
        </p>
        <button type="button" class="chip" id="template-reset">
          ${t("options.templateReset")}
        </button>
        <div class="template-preview" aria-live="polite">
          <span class="template-preview-label">${t("options.templatePreview")}</span>
          <pre id="template-preview-output"></pre>
        </div>
      </div>

      <div class="actions">
        <button id="save-button" type="submit">${t("options.saveSettings")}</button>
        <p id="status" role="status" aria-live="polite" hidden></p>
      </div>
    </form>
  `;

  elements = {
    form: getElement<HTMLFormElement>("options-form"),
    languageInput: getElement<HTMLSelectElement>("language"),
    instanceUrlInput: getElement<HTMLInputElement>("instance-url"),
    apiKeyInput: getElement<HTMLInputElement>("api-key"),
    defaultTagInput: getElement<HTMLInputElement>("default-tag"),
    clipTemplateInput: getElement<HTMLTextAreaElement>("clip-template"),
    templateResetButton: getElement<HTMLButtonElement>("template-reset"),
    templatePreviewOutput: getElement<HTMLElement>("template-preview-output"),
    templateVariableButtons: [
      ...getElement<HTMLElement>("options-form").querySelectorAll<HTMLButtonElement>(
        "[data-template-variable]",
      ),
    ],
    clipOnOpenInput: getElement<HTMLInputElement>("clip-on-open"),
    saveButton: getElement<HTMLButtonElement>("save-button"),
    status: getElement<HTMLElement>("status"),
  };

  elements.form.addEventListener("submit", (event) => {
    void handleSubmit(event);
  });
  elements.form.addEventListener("input", handleFormInput);
  elements.clipTemplateInput.addEventListener("input", updateTemplatePreview);
  elements.defaultTagInput.addEventListener("input", updateTemplatePreview);
  elements.templateResetButton.addEventListener("click", resetTemplate);
  for (const button of elements.templateVariableButtons) {
    button.addEventListener("click", () => {
      const variable = button.dataset.templateVariable;
      if (isTemplateVariable(variable)) {
        insertTemplateVariable(variable);
      }
    });
  }
  elements.languageInput.addEventListener("change", () => {
    void handleLanguageChange();
  });

  if (currentConfig) {
    fillForm(currentConfig, draft);
  } else {
    elements.clipTemplateInput.value = DEFAULT_CLIP_TEMPLATE;
    updateTemplatePreview();
  }
  updateFormAvailability();
  app.removeAttribute("aria-busy");
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element #${id}`);
  }
  return element as T;
}

function setStatus(message: string, kind: StatusKind = "info"): void {
  elements.status.textContent = message;
  elements.status.dataset.state = kind;
  elements.status.hidden = kind === "idle" || message.length === 0;
}

function setSaving(saving: boolean): void {
  isSaving = saving;
  elements.saveButton.textContent = saving
    ? t("options.savingSettings")
    : t("options.saveSettings");
  updateFormAvailability();
}

function updateFormAvailability(): void {
  elements.saveButton.disabled = isSaving;
  elements.languageInput.disabled = isSaving || isChangingLanguage;
  elements.clipOnOpenInput.disabled = isSaving || isChangingLanguage;
  elements.clipTemplateInput.disabled = isSaving || isChangingLanguage;
  elements.templateResetButton.disabled = isSaving || isChangingLanguage;
  for (const button of elements.templateVariableButtons) {
    button.disabled = isSaving || isChangingLanguage;
  }
  elements.form.setAttribute(
    "aria-busy",
    String(isSaving || isChangingLanguage),
  );
}

function readForm(): ExtensionConfig {
  const apiKey = elements.apiKeyInput.value.trim();
  if (!apiKey) {
    throw new Error(t("options.apiKeyRequired"));
  }

  return {
    instanceUrl: normalizeInstanceUrl(elements.instanceUrlInput.value),
    apiKey,
    defaultTag: normalizeDefaultTag(elements.defaultTagInput.value),
    clipTemplate: normalizeClipTemplate(elements.clipTemplateInput.value),
    clipOnOpen: elements.clipOnOpenInput.checked,
    language: selectedLanguage(),
  };
}

function selectedLanguage(): LanguagePreference {
  const value = elements.languageInput.value;
  return isLanguagePreference(value) ? value : "system";
}

function readFormDraft(): FormDraft {
  return {
    instanceUrl: elements.instanceUrlInput.value,
    apiKey: elements.apiKeyInput.value,
    defaultTag: elements.defaultTagInput.value,
    clipTemplate: elements.clipTemplateInput.value,
    clipOnOpen: elements.clipOnOpenInput.checked,
  };
}

function fillForm(config: ExtensionConfig, draft?: FormDraft): void {
  elements.instanceUrlInput.value = draft?.instanceUrl ?? config.instanceUrl;
  elements.apiKeyInput.value = draft?.apiKey ?? config.apiKey;
  elements.defaultTagInput.value = draft?.defaultTag ?? config.defaultTag;
  elements.clipTemplateInput.value = draft?.clipTemplate ?? config.clipTemplate;
  elements.clipOnOpenInput.checked = draft?.clipOnOpen ?? config.clipOnOpen;
  elements.languageInput.value = config.language;
  updateTemplatePreview();
}

async function initialize(): Promise<void> {
  try {
    currentConfig = await loadConfig();
    initializeI18n(currentConfig.language);
    applyDocumentLocale("options.documentTitle");
    renderPage();
  } catch {
    initializeI18n("system");
    applyDocumentLocale("options.documentTitle");
    renderPage();
    setStatus(t("options.couldNotReadSettings"), "error");
  }
}

async function handleLanguageChange(): Promise<void> {
  if (!currentConfig || isSaving || isChangingLanguage) {
    return;
  }

  const nextLanguage = selectedLanguage();
  if (nextLanguage === currentConfig.language) {
    return;
  }

  const draft = readFormDraft();
  const previousConfig = currentConfig;
  isChangingLanguage = true;
  updateFormAvailability();

  try {
    await saveConfig({ ...previousConfig, language: nextLanguage });
    currentConfig = { ...previousConfig, language: nextLanguage };
    setLanguagePreference(nextLanguage);
    applyDocumentLocale("options.documentTitle");
    isChangingLanguage = false;
    renderPage(draft);
    setStatus(t("options.saved"), "success");
  } catch {
    currentConfig = previousConfig;
    isChangingLanguage = false;
    elements.languageInput.value = previousConfig.language;
    updateFormAvailability();
    setStatus(t("options.saveFailed"), "error");
  }
}

async function handleSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  if (isSaving || isChangingLanguage || !elements.form.reportValidity()) {
    return;
  }

  let nextConfig: ExtensionConfig;
  try {
    nextConfig = readForm();
  } catch (error) {
    setStatus(errorMessage(error, t("options.checkSettings")), "error");
    return;
  }

  const previousConfig = currentConfig;
  const nextPermission = originPermission(nextConfig.instanceUrl);
  const previousPermission = safeOriginPermission(previousConfig?.instanceUrl);

  setSaving(true);
  setStatus(t("options.requestingPermission"), "info");

  try {
    // This is deliberately the first awaited browser call in the submit handler:
    // optional permissions must be requested while the user gesture is active.
    const granted = await chrome.permissions.request({
      origins: [nextPermission],
    });
    if (!granted) {
      setStatus(t("options.permissionDenied"), "error");
      return;
    }

    setStatus(t("options.saving"), "info");
    await saveConfig(nextConfig);
    currentConfig = nextConfig;
    fillForm(nextConfig);

    if (previousPermission && previousPermission !== nextPermission) {
      try {
        await chrome.permissions.remove({ origins: [previousPermission] });
      } catch (error) {
        console.warn("Failed to remove the previous host permission", error);
        setStatus(t("options.savedOldPermission"), "warning");
        return;
      }
    }

    setStatus(t("options.saved"), "success");
  } catch {
    setStatus(t("options.saveFailed"), "error");
  } finally {
    setSaving(false);
  }
}

function safeOriginPermission(instanceUrl: string | undefined): string | null {
  if (!instanceUrl) {
    return null;
  }

  try {
    return originPermission(instanceUrl);
  } catch {
    return null;
  }
}

function handleFormInput(): void {
  if (elements.status.dataset.state === "success") {
    setStatus(t("options.unsavedChanges"), "info");
  }
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

void initialize();
