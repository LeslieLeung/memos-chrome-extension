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
```

`npm run build` writes the packaged extension to `dist/`. In Chrome, open the Extensions page, enable Developer mode, select **Load unpacked**, and choose that directory.

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

GitHub Actions runs checks, builds the project, and creates a GitHub Release with a `memos-chrome-extension-vX.Y.Z.zip` archive that can be unzipped and loaded into Chrome.

## Entry points and build output

- `src/popup.ts`: extension popup entry point, paired with `popup.html`
- `src/options.ts`: settings page entry point, paired with `options.html`
- `src/background.ts`: Manifest V3 background service worker
- `public/manifest.json`: extension manifest, copied to `dist/` during the build
- `dist/assets/background.js`: fixed-name background-script build output

Vite emits content-hashed JavaScript files for the popup and settings page. Tests use Vitest and jsdom; code quality checks use ESLint. `validate:dist` verifies the manifest's background script and page entry points, all required PNG icon sizes, and native Chrome localization messages for English and Simplified Chinese.

## Permissions and data handling

The extension requests only the following permissions by default:

- `storage`: stores the instance URL, access token, default tag, default clipping preference, language preference, and most recently created Memo.
- `activeTab`: reads the current page title and URL only when the user explicitly clips it.

HTTP and HTTPS host permissions for a self-hosted Memos instance are optional. The extension requests the configured instance origin when the user saves their settings rather than declaring broad permanent site access. The access token is stored in local extension storage and must not be logged or exposed in error details.

Clipping is initiated by the **Clip this page** button in the popup. The optional **Clip the current page when opening the extension** setting pre-fills a new empty Memo with the current page's title and a URL stripped of common tracking parameters. It never overwrites an existing draft and is disabled by default.

## Localization

The extension supports Simplified Chinese and English. On first use, and when the user selects the system default, a Chrome UI language starting with `zh` selects Simplified Chinese; all other languages select English. The Settings page lets users choose the system default, Chinese, or English at any time. This preference is saved immediately and does not require a configured Memos instance or Access Token.

The extension name uses Chrome's native localization and therefore follows Chrome's UI language. The popup, settings page, and toolbar tooltip follow the language selected within the extension.
