import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const distDirectory = resolve("dist");
const manifestPath = resolve(distDirectory, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

if (manifest.manifest_version !== 3) {
  throw new Error("dist/manifest.json is not Manifest V3.");
}

const referencedFiles = new Set([
  manifest.background?.service_worker,
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

console.log(`Validated ${referencedFiles.size} Manifest file references.`);
