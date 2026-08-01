# 07 · 开发指南

[← 返回索引](README.md)

## 常用命令（`package.json` scripts）

| 命令 | 作用 |
|------|------|
| `npm run tauri dev` | 启动桌面应用（开发模式，热重载） |
| `npm run dev` | 仅前端 vite（一般用上面的 tauri dev） |
| `npm run typecheck` | `tsc --build --pretty`（类型检查） |
| `npm run build` | typecheck + `vite build`（前端产物） |
| `npm run build:desktop` | 构建 mcp-server + 前端（打包桌面用） |
| `npm run test:mocks` | Vitest 单测（排除 real-llm 与 mcp-server） |
| `npm run test:llm` | 真实 LLM 集成测试（需 `.env.test.local`） |
| `npm test` | mocks + llm 全量 |
| `npm run mcp:build` / `mcp:test` | 构建 / 测试 mcp-server |

> 提交前建议至少跑：`npm run typecheck` + `npm run test:mocks`。涉及生产打包再 `vite build`。

## 环境与依赖

- 安装依赖：`npm install`（上游偶尔新增依赖，如 v0.6.6 加了 `pdfjs-dist`）。
- **依赖版本红线**：`lucide-react` 锁 `^1.7.0`。**不要**升级它——误升到 1.28.x 会导致
  vite "Failed to resolve entry for package lucide-react"，7 个组件测试加载失败。
- 新增/改依赖请用包管理器（`npm install <pkg>` / `npm uninstall <pkg>`），不要手改 package.json。

## 测试约定

- 测试框架：Vitest；单测文件 `*.test.ts(x)`，真实 LLM 用 `*.real-llm.test.ts`。
- **i18n 校验**：`src/i18n/i18n-parity.test.ts` 要求 `en.json` ⊇ `zh.json`。
  **新增任何文案，必须同时在 `zh.json` 与 `en.json` 加 key**，否则测试失败。
- 现基线：`npm run test:mocks` 全绿（v0.6.6 为 120 文件 / 1741 测试）。改动后应保持全绿。

## 应用标识（改名时的三处要害）

见 [06-fork-customizations.md#7-品牌-lluren-wiki](06-fork-customizations.md)。要点：
- 基座 `tauri.conf.json` 的 `productName` / 窗口 `title`；
- **Windows 覆盖** `tauri.windows.conf.json` 的 `title`（否则标题栏回退 "Tauri App"）；
- `Cargo.toml` 的 `[[bin]] name`（决定 dev 任务栏 exe 名）；
- `index.html` 的 `<title>`。

## 上游同步（merge upstream）

- remote：`origin`=本 fork，`upstream`=`nashsu/llm_wiki`。
- 流程：
  ```
  git fetch upstream
  git log --oneline HEAD..upstream/main        # 看新增提交
  git diff --stat HEAD...upstream/main          # 看影响文件
  git branch backup-before-<ver>-merge          # 先建备份分支
  git merge upstream/main --no-edit             # 合并
  # 解冲突（历史上仅 tauri.conf.json 的 productName vs version 相邻行冲突：
  #   保留本 fork 的 productName，取上游的 version）
  npm install && npm run typecheck && npm run test:mocks && npx vite build
  ```
- 合并后**核对定制未被覆盖**：`tauri.conf.json`(productName/title) / `Cargo.toml`([[bin]] name) /
  `tauri.windows.conf.json`(title) / `wiki-store.ts`(previewReturnView/todosInitialTab)。
- **合并后务必回来更新本 Wiki**（见 [README 维护规则](README.md#️-维护规则必须遵守)）。
- 最近一次：合并到 **v0.6.6**（19 个上游提交，主要为 Windows 路径修复、PDF 预览、ingest 重试、
  clip 重启上限、新增 bocha 搜索源）。

## 提交约定

- 常规提交**排除 `package-lock.json`**；仅在重大上游合并或依赖变更时纳入。
- 提交信息说明清楚"做了什么 + 为什么"，涉及上游合并时列出合入要点与保留的定制（可参考
  历史 merge commit 的写法）。
- **未经明确许可，不要 commit / push / merge / 部署 / 变更依赖版本。**

## Windows 本地环境小贴士

- **`git pull` 拉到新代码后，务必先 `npm install` 再 `npm run tauri dev`**（在项目根目录，不是
  `src-tauri`）。上游同步常新增前端依赖（如 v0.6.6 的 `pdfjs-dist`），旧 `node_modules` 缺文件会让
  Vite 报 `Failed to resolve import "pdfjs-dist/legacy/build/pdf.mjs"` 之类的错——这是依赖没装全，
  不是代码 bug。若 `npm install` 后仍报错，做一次干净重装：删 `node_modules` 与 `package-lock.json`
  后重新 `npm install`。
- `git pull` 因 `Cargo.toml` 的 CRLF/LF 伪改动被挡时：`git checkout -- src-tauri/Cargo.toml` 后再 pull；
  可 `git config core.autocrlf false` 根治。
- 连 GitHub 443 被干扰时（能 ping 通但连不上）需走代理：
  `git config --global http.proxy http://127.0.0.1:<port>`（Clash 常见 7890）。

## 目录参照

- 前端细节 → [03-frontend.md](03-frontend.md)
- 后端/命令/服务 → [04-backend.md](04-backend.md)
- 功能行为 → [05-features.md](05-features.md)
- fork 定制清单 → [06-fork-customizations.md](06-fork-customizations.md)
