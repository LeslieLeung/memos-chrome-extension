# Development Guide

This document contains development, build, release, and implementation notes for Memos Clipper. For end-user setup and usage, see [README.md](README.md) or the [Simplified Chinese README](README_CN.md).

## Local development

Node.js 20.19 or later is required.

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run validate:dist
npm run build:firefox
npm run validate:firefox
```

`npm run build` writes the packaged extension to `dist/`. In Chrome, open the Extensions page, enable Developer mode, select **Load unpacked**, and choose that directory.

`npm run build:firefox` writes a Firefox desktop MV3 extension to `dist-firefox/`. Load `dist-firefox/manifest.json` with **Load Temporary Add-on** at `about:debugging#/runtime/this-firefox`. Firefox 140 or later is required. For Mozilla's static extension validation, run:

```bash
npx --yes web-ext@10.8.0 lint --source-dir dist-firefox
```

The Firefox build overlays `manifests/firefox.json` on the shared manifest, removes `minimum_chrome_version`, and uses a module background script instead of Chrome's service worker. Both builds retain their own output directory. The version remains sourced from `public/manifest.json`, so version syncing applies to both.

`src/lib/browser.ts` selects Firefox's promise-based `browser` namespace or Chrome's MV3 `chrome` namespace. Only the common APIs used by this extension are covered by its Chrome typings. Storage, popup, settings, and background tests run against both namespaces.

Firefox host-permission patterns omit the port, as required by [Firefox's match-pattern syntax](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns). The configured Memos API URL keeps its port and deployment path. Chrome continues to request the specific configured origin.

Firefox's manifest declares authentication information, browsing activity, and website content transmission because saving sends the token, clipped URL, and content to the configured Memos instance. The minimum version of 140 ensures [Firefox's built-in data consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/) is available. No telemetry is collected.

## Release

Bump or sync the version across `package.json`, `package-lock.json`, and `public/manifest.json`:

```bash
npm run version:sync -- patch   # or minor / major / 0.2.0
npm run version:sync            # sync lock + manifest to package.json
```

Commit the version files, then push the matching `vX.Y.Z` tag, for example:

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions uses Ubuntu x86-64 and Node.js 22 to check and build both targets, submit the Firefox build to Mozilla for unlisted signing, and create a GitHub Release with these assets:

- `memos-chrome-extension-vX.Y.Z.zip`: Chrome unpacked installation.
- `memos-firefox-extension-vX.Y.Z.zip`: unsigned Firefox build for temporary installation.
- `memos-firefox-extension-vX.Y.Z.xpi`: Mozilla-signed Firefox extension for permanent installation.

### Configure Firefox signing

Create credentials on the [AMO API credentials page](https://addons.mozilla.org/developers/addon/api/key/), accepting Mozilla's developer agreement if prompted. In the GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret** and add:

| Repository secret | Value from AMO |
| --- | --- |
| `AMO_API_KEY` | JWT issuer / API key |
| `AMO_API_SECRET` | JWT secret / API secret |

The workflow checks these secrets before building and passes them to `web-ext` as environment variables only in the signing steps. Keep credential values out of source files and workflow arguments.

The workflow uses [`web-ext sign --channel unlisted`](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#web-ext-sign), so Mozilla signs the extension for distribution through GitHub without a public AMO listing. The first successful submission registers `memos-clipper@leslieleung` with the AMO account that owns the credentials; keep this Gecko ID stable, and use credentials from an account authorized to update that add-on in future releases. Each new submission needs a new extension version.

Because Vite bundles and minifies the code, the workflow also submits an archive of the exact tagged commit as reviewer source, including the lockfile and these build instructions. Reviewers can reproduce the Firefox build on Ubuntu with Node.js 22:

```bash
npm ci
npm run build:firefox
npm run validate:firefox
```

The signing step waits up to 30 minutes for approval. Missing credentials, signing errors, or a missing signed `.xpi` stop publication; the workflow does not substitute an unsigned package. Mozilla may require manual review. If approval times out, inspect the submission in the [AMO Developer Hub](https://addons.mozilla.org/developers/) before retrying; a version already submitted may need to be downloaded there rather than submitted again. After signing succeeds, all three release files are saved as a GitHub Actions artifact before publishing the Release, so they can be recovered if Release creation fails.

GitHub-installed copies are updated by installing the next signed `.xpi` over the existing extension. This workflow does not configure a self-hosted automatic update feed.

## Entry points and build output

- `src/popup.ts`: extension popup entry point, paired with `popup.html`
- `src/options.ts`: settings page entry point, paired with `options.html`
- `src/background.ts`: shared MV3 background entry point (Chrome service worker / Firefox event page)
- `public/manifest.json`: shared Chrome manifest
- `manifests/firefox.json`: Firefox manifest overrides
- `dist/assets/background.js`: fixed-name background-script build output

Vite emits content-hashed JavaScript files for the popup and settings page. Tests use Vitest and jsdom; code quality checks use ESLint. `validate:dist` verifies the manifest's background script and page entry points, all required PNG icon sizes, and native browser localization messages for English and Simplified Chinese.

## Permissions and data handling

The extension requests only the following permissions by default:

- `storage`: stores the instance URL, access token, default tag, default clipping preference, language preference, and most recently created Memo.
- `scripting`: reads selected text and the page description through one-off script injection when clipping.
- `activeTab`: reads the current page title and URL only when the user explicitly clips it.

HTTP and HTTPS host permissions for a self-hosted Memos instance are optional. The extension requests the configured instance origin when the user saves their settings rather than declaring broad permanent site access. The access token is stored in local extension storage and must not be logged or exposed in error details.

Clipping is initiated by the **Clip this page** button in the popup. The optional **Clip the current page when opening the extension** setting pre-fills a new empty Memo with the current page's title and a URL stripped of common tracking parameters. It never overwrites an existing draft and is disabled by default.

## Localization

The extension supports Simplified Chinese and English. On first use, and when the user selects the system default, a browser UI language starting with `zh` selects Simplified Chinese; all other languages select English. The Settings page lets users choose the system default, Chinese, or English at any time. This preference is saved immediately and does not require a configured Memos instance or Access Token.

The extension name uses the browser's native localization and therefore follows the browser's UI language. The popup, settings page, and toolbar tooltip follow the language selected within the extension.
