# Memos Clipper

[简体中文](README_CN.md)

Memos Clipper is a Chrome extension for saving a thought or the page you are reading directly to your own Memos instance.

## What it does

- Create a new Memo from the extension popup.
- Clip the current web page: its cleaned URL is added to the editor for review before saving.
- Check for an existing Memo with the same link and ask before saving a duplicate.
- Continue editing the most recently created Memo, or start a new one at any time.
- Restore unsent drafts when you reopen the popup.
- Append one optional default tag without duplicating it.
- Use the interface in English, Simplified Chinese, or follow Chrome's language.

## Install

1. Download and unzip a release package, or build the extension from source.
2. In Chrome, open `chrome://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked**, then select the unzipped extension folder (or this project's `dist/` folder after building).
5. Pin **Memos Clipper** from Chrome's Extensions menu if you want it always visible in the toolbar.

## Set up your Memos instance

1. Open Memos Clipper and select **Settings**.
2. Enter your Memos instance URL, for example `https://memos.example.com`. Do not add `/api/v1`.
3. Create an Access Token in your Memos account and paste it into **Access Token**.
4. Optionally set a default tag such as `#inbox`.
5. Select **Save settings** and approve Chrome's request to access that Memos instance.

Your instance URL, token, preferences, drafts, and the reference to the most recently created Memo are saved only in Chrome's local extension storage. The extension asks for access only to the Memos origin you configure.

## Save a Memo or clip a page

Open the extension from the toolbar, write your Memo, then select **Create memo**. After it is created, the same editor updates that Memo; choose **New memo** when you want a separate one. You can also press <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd> to save.

To clip the current page, select **Clip this page**. Memos Clipper adds the URL to the editor and removes common tracking parameters. When you save content containing a link, it searches your existing Memos first and asks whether to continue if the same link is already present. Chrome internal pages and other non-web pages cannot be clipped.

In Settings, you can enable **Clip the current page when opening the extension**. This fills a fresh Memo automatically and never overwrites an existing draft.

## Privacy and permissions

- **Storage** keeps your configuration and drafts in `chrome.storage.local`.
- **Active tab** is used only after you choose to clip the current page, to read its URL.
- **Host access** is requested only for the Memos instance URL you save, so the extension can call its API.

Do not share your Access Token. It is not displayed in error details or written to application logs.

## Need help?

First, confirm that the instance URL is reachable in Chrome, the token is valid, and Chrome has been granted access to the configured instance. You can reopen **Settings** from the popup to update either value.

## Development

For local development, release workflow, build output, and implementation details, see [DEVELOPMENT.md](DEVELOPMENT.md).
