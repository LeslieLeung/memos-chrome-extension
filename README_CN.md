# Memos Clipper

[English](README.md)

Memos Clipper 是一个支持 Chrome 和 Firefox 的浏览器扩展，用于把随手记录或正在浏览的网页，直接保存到你自己的 Memos 实例。

## 功能

- 在扩展弹窗中创建新 Memo。
- 剪藏当前网页：将清理后的链接填入编辑器，确认后再保存。
- 保存前检索是否已有相同链接，发现重复时由你确认是否继续。
- 继续编辑最近创建的 Memo，或随时新建一条。
- 再次打开弹窗时恢复未提交的草稿。
- 自动追加一个可选的默认标签，且不会重复添加。
- 支持 English、简体中文或跟随浏览器语言。

## 安装

### Chrome

1. 下载并解压 Chrome 发布包（`memos-chrome-extension-vX.Y.Z.zip`），或运行 `npm ci && npm run build` 从源码构建。
2. 在 Chrome 打开 `chrome://extensions`。
3. 开启“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择解压后的扩展目录；如果从源码构建，请选择项目中的 `dist/` 目录。
5. 如需固定显示，可在 Chrome 的扩展程序菜单中固定 **Memos Clipper**。

### Firefox（桌面版 140 或更新版本）

永久安装：从 GitHub Release 下载 `memos-firefox-extension-vX.Y.Z.xpi`。在 Firefox 打开 `about:addons`，点击齿轮菜单 → “从文件安装附加组件”，选择 `.xpi` 并确认安装。发布流程会通过 Mozilla 签名，安装后重启 Firefox 仍然保留。

临时安装或本地开发：

1. 下载并解压 Firefox 发布包（`memos-firefox-extension-vX.Y.Z.zip`），或运行 `npm ci && npm run build:firefox` 从源码构建。
2. 打开 `about:debugging#/runtime/this-firefox`，点击“临时载入附加组件”。
3. 选择解压目录中的 `manifest.json`；从源码构建时选择 `dist-firefox/manifest.json`。
4. 从工具栏扩展菜单打开 **Memos Clipper**。

临时安装会在 Firefox 重启后移除。本地构建产物和 `.zip` 发布包未签名，永久安装请使用签名后的 `.xpi`。更新时，以相同方式安装新版 Release 中的 `.xpi` 即可。

## 连接 Memos 实例

1. 打开 Memos Clipper，进入“设置”。
2. 填写 Memos 实例地址，例如 `https://memos.example.com`，无需添加 `/api/v1`。
3. 在 Memos 账户中创建 Access Token，并粘贴到“Access Token”。
4. 可选：设置默认标签，例如 `#inbox`。
5. 点击“保存设置”，并同意浏览器请求访问该 Memos 实例。

实例地址、Token 和偏好设置保存在浏览器的本地扩展存储中，草稿及最近创建 Memo 的引用保存在当前浏览器会话的扩展存储中。扩展只会申请访问你配置的 Memos 域名。

## 创建 Memo 与剪藏网页

从工具栏打开扩展，输入内容后点击“创建 Memo”。创建成功后，继续在同一编辑器中保存会更新该 Memo；如需另建一条，请点击“新建”。也可以按 <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd> 保存。

点击“剪藏此页”会将当前网页链接填入编辑器，并移除链接中常见的追踪参数。保存含链接的新 Memo 前，扩展会先检索已有 Memos；如发现相同链接，会询问是否仍要继续。浏览器内部页面及其他非网页地址无法剪藏。

你也可以在“设置”中开启“打开扩展时默认剪藏当前网页”。它只会自动填充新的空白 Memo，不会覆盖已有草稿。

## 隐私与权限

- **存储**：配置保存在本地扩展存储，草稿保存在当前浏览器会话的扩展存储中；退出浏览器后草稿会清除。
- **当前标签页**：仅在你主动剪藏当前页面时读取页面链接。
- **网站访问权限**：仅在保存设置时，为你填写的 Memos 实例申请，用于调用其 API。

保存时，Memo 内容、剪藏链接和页面内容会发送到你配置的 Memos 实例，并使用 Access Token 认证。Firefox 安装时会披露对应的数据传输类别。扩展不包含遥测。

请勿泄露 Access Token。扩展不会在错误详情中显示 Token，也不会将它写入应用日志。

## 遇到问题？

请先确认实例地址可在浏览器中访问、Access Token 有效，并且浏览器已授予该实例访问权限。可从扩展弹窗重新打开“设置”并修改配置。

## 开发

本地开发、发布流程、构建产物和实现细节请参阅 [DEVELOPMENT.md](DEVELOPMENT.md)。
