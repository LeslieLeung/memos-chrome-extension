import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const packagePath = resolve("package.json");
const lockPath = resolve("package-lock.json");
const manifestPath = resolve("public/manifest.json");

const input = process.argv[2];
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
const currentVersion = packageJson.version;

if (typeof currentVersion !== "string" || !isChromeCompatibleVersion(currentVersion)) {
  throw new Error(`Invalid package.json version: ${currentVersion}`);
}

const nextVersion = input ? resolveNextVersion(currentVersion, input) : currentVersion;

await setRootVersion(packagePath, nextVersion);
await setLockfileVersion(lockPath, nextVersion);
await setRootVersion(manifestPath, nextVersion);

console.log(
  input
    ? `Bumped version ${currentVersion} → ${nextVersion}`
    : `Synced version to ${nextVersion}`,
);

function resolveNextVersion(version, value) {
  if (value === "major" || value === "minor" || value === "patch") {
    return bumpVersion(version, value);
  }

  if (!isChromeCompatibleVersion(value)) {
    throw new Error(
      `Invalid version "${value}". Use major, minor, patch, or x.y.z (Chrome-compatible).`,
    );
  }

  return value;
}

function bumpVersion(version, type) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/u.exec(version);
  if (!match) {
    throw new Error(`Cannot bump non-numeric version: ${version}`);
  }

  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);

  if (type === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
}

function isChromeCompatibleVersion(version) {
  // Chrome extension versions are 1-4 dot-separated integers (0-65535). No prerelease tags.
  return /^(0|[1-9]\d{0,4})(\.(0|[1-9]\d{0,4})){1,3}$/u.test(version);
}

async function setRootVersion(path, version) {
  const text = await readFile(path, "utf8");
  const updated = text.replace(/("version"\s*:\s*")[^"]*(")/u, `$1${version}$2`);

  if (updated === text) {
    const current = JSON.parse(text).version;
    if (current === version) {
      return;
    }
    throw new Error(`Could not update version in ${path}`);
  }

  await writeFile(path, updated);
}

async function setLockfileVersion(path, version) {
  const lock = JSON.parse(await readFile(path, "utf8"));
  lock.version = version;
  if (lock.packages?.[""]) {
    lock.packages[""].version = version;
  }
  await writeFile(path, `${JSON.stringify(lock, null, 2)}\n`);
}
