import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const target = process.argv[2] ?? "chrome";
if (!["chrome", "firefox"].includes(target)) {
  throw new Error(`Unknown browser target: ${target}`);
}
const distDirectory = resolve(target === "firefox" ? "dist-firefox" : "dist");
const manifestPath = resolve(distDirectory, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (manifest.manifest_version !== 3) {
  throw new Error(`${manifestPath} is not Manifest V3.`);
}

const background = manifest.background;
if (background?.type !== "module") {
  throw new Error("Background entry point must be an ES module.");
}
if (target === "firefox") {
  const gecko = manifest.browser_specific_settings?.gecko;
  if (
    !Array.isArray(background.scripts) || background.scripts.length === 0 ||
    background.service_worker || manifest.minimum_chrome_version ||
    !gecko?.id || gecko.strict_min_version !== "140.0" ||
    !["authenticationInfo", "browsingActivity", "websiteContent"].every(
      (type) => gecko.data_collection_permissions?.required?.includes(type),
    )
  ) {
    throw new Error("Invalid Firefox background or browser-specific settings.");
  }
} else if (!background.service_worker || background.scripts || manifest.browser_specific_settings) {
  throw new Error("Invalid Chrome service worker manifest.");
}

const referencedFiles = new Set([
  ...(target === "firefox" ? background.scripts : [background.service_worker]),
  manifest.action?.default_popup,
  manifest.options_page,
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
]);

for (const relativePath of referencedFiles) {
  if (typeof relativePath !== "string" || !relativePath) {
    throw new Error("Manifest contains an empty required file reference.");
  }
  await access(resolve(distDirectory, relativePath));
}

for (const htmlFile of [manifest.action.default_popup, manifest.options_page]) {
  const html = await readFile(resolve(distDirectory, htmlFile), "utf8");
  if (/rel=["']modulepreload["']/u.test(html)) {
    throw new Error(`${htmlFile} contains an unsupported module preload.`);
  }
}

if (manifest.commands && Object.keys(manifest.commands).length > 0) {
  throw new Error("Manifest must not declare keyboard commands.");
}

const requiredMessages = [
  "extensionName",
  "extensionDescription",
  "actionTitle",
];

for (const locale of ["en", "zh_CN"]) {
  const messagesPath = resolve(distDirectory, "_locales", locale, "messages.json");
  const messages = JSON.parse(await readFile(messagesPath, "utf8"));
  for (const key of requiredMessages) {
    if (typeof messages[key]?.message !== "string" || !messages[key].message) {
      throw new Error(`Missing ${key} message for locale ${locale}.`);
    }
  }
}

console.log(`Validated ${target}: ${referencedFiles.size} Manifest file references.`);
