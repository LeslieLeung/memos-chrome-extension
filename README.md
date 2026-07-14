# Memos Chrome Extension

一个基于 Chrome Manifest V3 的浏览器扩展，用于快速创建 Memos，以及将当前网页剪藏到自己的 Memos 实例。

## 本地开发

要求 Node.js 20.19 或更高版本。

```bash
npm install
npm run dev
```

常用命令：

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run validate:dist
```

`npm run build` 会生成 `dist/`。在 Chrome 的扩展程序页面打开“开发者模式”，选择“加载已解压的扩展程序”，然后选择该目录。

## 入口与构建产物

- `src/popup.ts`：扩展弹窗入口，对应 `popup.html`
- `src/options.ts`：设置页入口，对应 `options.html`
- `src/background.ts`：Manifest V3 后台 Service Worker
- `public/manifest.json`：扩展清单，构建时复制到 `dist/`
- `dist/assets/background.js`：固定名称的后台脚本产物

弹窗和设置页由 Vite 生成带内容哈希的脚本文件。测试使用 Vitest 和 jsdom，代码检查使用 ESLint。
`validate:dist` 会检查 Manifest 的后台脚本、页面入口、各尺寸 PNG 图标，以及中英文原生本地化消息是否都存在。

## 权限说明

扩展默认只申请：

- `storage`：保存实例地址、访问令牌、默认标签、默认剪藏设置、语言偏好和最近创建的 Memo
- `activeTab`：在用户主动触发剪藏时读取当前页面标题和地址

访问自托管 Memos 实例所需的 HTTP/HTTPS 域名权限声明为可选权限，应在用户保存实例配置时按需请求。访问令牌保存在浏览器扩展的本地存储中，不应写入日志或展示在错误详情里。

剪藏通过弹窗中的“剪藏此页”按钮触发。设置页可开启“默认剪藏当前网页”：每次打开扩展时，会在新的空白 Memo 中自动填入清理追踪参数后的当前页面链接；已有草稿不会被覆盖。该选项默认关闭。

## 语言

扩展只提供简体中文和 English。首次使用及选择“跟随系统”时，会按 Chrome 的界面语言自动选择：`zh*` 使用简体中文，其余语言使用 English。设置页可随时选择“跟随系统”、中文或 English；语言偏好会立即保存，不需要先填写 Memos 实例或 Access Token。

扩展名称使用 Chrome 原生本地化，因此它跟随 Chrome 的界面语言；弹窗、设置页和工具栏提示则遵循扩展内的语言选择。
