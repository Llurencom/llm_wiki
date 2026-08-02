# 04 · 后端（src-tauri/）

[← 返回索引](README.md)

## Tauri 配置

- **基座** `tauri.conf.json`：`productName: "Lluren Wiki"`、`identifier: com.llmwiki.app`、
  `version: 0.6.6`；窗口 `title: "Lluren Wiki"`、1200×800、`hiddenTitle: true`、
  `titleBarStyle: Transparent`；CSP 允许 self/https/http；asset 协议全量开放。
- **平台覆盖**（合并覆盖基座）：
  - `tauri.windows.conf.json`：`titleBarStyle: Visible`、`hiddenTitle: false`，**并补
    `"title": "Lluren Wiki"`**（fork 修复：否则回退 "Tauri App"）；打包 pdfium.dll + mcp-server。
  - `tauri.macos.conf.json` / `tauri.linux.conf.json`：打包对应 libpdfium + mcp-server node_modules。

## Cargo（`src-tauri/Cargo.toml`）

- `[package] name = "llm-wiki"`，`version = 0.6.6`，edition 2021。
- `[lib] name = "llm_wiki_lib"`（staticlib/cdylib/rlib）。
- **`[[bin]] name = "Lluren-Wiki"`**（fork 定制，决定 dev 任务栏显示的 exe 名）。
- Release profile：`codegen-units=1`、`lto=true`、`opt-level="s"`、**`panic="unwind"`**
  （配合 `panic_guard` 把 FFI/解析器 panic 转成 Err）。
- 关键依赖：`tauri`(+protocol-asset/tray-icon)、各 `tauri-plugin-*`（opener/autostart/dialog/store/http）、
  `pdfium-render`、`docx-rs`/`office_oxide`/`calamine`/`epub`/`mobi`/`html2text`（文档解析）、
  `lancedb`+`arrow-*`（向量库）、`reqwest`（rustls）、`tiny_http`（本地服务）、`tokio`、`notify`/`walkdir`。

## 启动流程（`main.rs` → `lib.rs::run()`）

`main.rs` 仅 `llm_wiki_lib::run()`。`lib.rs` 的 `tauri::Builder`：
1. 注册插件：opener / dialog / store / autostart / http（Rust 侧 HTTP，绕过浏览器 CORS）。
2. `.setup()`：设 pdfium 资源目录提示；从 app-state.json 应用全局 HTTP 代理（在首个请求前）；
   注册状态管理器（`ClaudeCliState`/`CodexCliState`/`FileSyncState`/`AgentSessionStore`/
   `AgentCancellationRegistry`/Tray/CloseBehavior）；**启动 `clip_server` 与 `api_server`**；建托盘菜单。
3. 关闭行为（`CloseBehaviorState`）：`exit`→销毁并退出；`minimize`→隐藏(有托盘)/最小化；
   `ask`（默认）→弹"退出 or 隐藏"（因后台有本地服务）。
4. macOS `RunEvent::Reopen`（点 Dock）→ 显示主窗口。
5. `generate_handler![...]` 注册约 50 个命令。

## Tauri 命令面（FE↔BE 契约，节选）

> 完整以 `grep -rn "#\[tauri::command\]" src-tauri/src` 为准；改动命令签名时同步本表。

- **文件/文档 `commands/fs.rs`**：`read_file`(智能多格式抽取)、`preprocess_file`、
  `write_file`/`write_file_atomic`/`write_file_base64`、`apply_text_selection_edit`(TOCTOU 安全)、
  `create_missing_wiki_page`、`list_directory`、`copy_file`/`copy_directory`、`delete_file`、
  `find_related_wiki_pages`、`file_exists`/`get_file_modified_time`/`get_file_size`/`get_file_md5`、
  `read_file_as_base64`。
- **搜索 `commands/search.rs`**：`search_project`(关键词+向量+图 融合)、`embedding_fetch`/`_batch`、
  `get_page_links`。
- **向量库 `commands/vectorstore.rs`**：`vector_upsert/search/delete/count`、`*_chunks`、`vector_delete_page`。
- **外部搜索 `commands/external_search.rs`**：`web_search`、`anytxt_search`。
- **CLI 传输 `commands/claude_cli.rs` / `codex_cli.rs`**：`*_detect`/`*_spawn`/`*_kill`（子进程，MCP 隔离）。
- **图片抽取 `commands/extract_images.rs`**：`extract_pdf_images_cmd`、`extract_office_images_cmd`、
  `extract_and_save_*`。
- **历史/同步 `file_history.rs` / `file_sync.rs`**：`list/restore_file_history`、
  `start/stop_project_file_watcher`、`rescan_project_files`、`get_file_change_queue`、`retry/ignore_file_change_task`。
- **项目 `project.rs` / `project_maintenance.rs`**：`create/open_project`、`open_project_folder`、
  `export/import_project_archive`、`rebuild_wiki_index`。
- **服务状态 / Agent（lib.rs, agent/skills.rs）**：`clip_server_status`、`api_server_status`、
  `api_server_reload_config`、`agent_start_turn`、`agent_start_turn_stream`(发 `agent-event`)、
  `agent_cancel_turn`、`agent_get_session`、`agent_list_sessions`、`agent_list_skills`、
  `agent_create_skill`（写 `<项目>/.llm-wiki/skills/<id>.md`，校验 id/必填字段、拒覆盖）、
  `agent_delete_skill`（按根目录优先解析并删除 `<id>.md` 或 `<id>/SKILL.md`）、
  `mcp_server_entry_path`、`set_proxy_env`、`set_close_behavior`。

## Agent 运行时（`src-tauri/src/agent/`）

桌面 UI / HTTP API / MCP 三入口共用同一套：
- `runtime.rs`：`AgentRuntime` 编排——工具规划/执行循环、上下文构建、取消。
- `provider.rs`：`AgentLlmProvider` + `LlmClient`（OpenAI/Anthropic/Google/Azure/Ollama/自定义/Claude CLI），流式、token 限制。
- `tools.rs`：`BuiltinToolRegistry` 内置工具——`wiki.write_page/search/read_page`、`source.search`、
  `web.search`、`anytxt.search`、`browser.fetch`、`shell.exec`(需审批)、`graph.search`。
  限制：每轮最多 8 次工具迭代、最多 20 条知识项、shell 输出截断。
- `types.rs`：`AgentChatRequest/Response`、`AgentMode`(fast/standard/local_first)、
  `AgentRetrievalMode`(standard/smart/faithful)。
- 其余：`router.rs`(意图路由)、`context.rs`、`skills.rs`、`session.rs`(每项目会话持久化)、
  `cancel.rs`、`workspace.rs`、`events.rs`、`permissions.rs`。

## 本地服务

- **clip_server（:19827，`clip_server.rs`）**：接收浏览器扩展剪藏内容（POST /clip）。
  绑定重试 3 次×2s；重启重试上限 10 次×5s（fork/上游修复的 restart retry limit）。
  状态：starting/running/port_conflict/error；管理 `CURRENT_PROJECT`/`ALL_PROJECTS`/`PENDING_CLIPS`。
  仅本地，不暴露 LAN。
- **api_server（:19828，`api_server.rs`）**：外部 REST + MCP。
  - 鉴权：token（或 unauthenticated + IP 白名单）；限流 120 req/s；并发在途 64；body 1MB（chat 40MB）。
  - 路由（`/api/v1`）：`GET /health`（恒可用）、`/projects`、`/projects/{id}/files[/content]`、
    `/reviews`(+PATCH/bulk resolve)、`POST /search`、`GET /graph`、`POST /sources/rescan`、
    `POST /chat`(+`/chat/{session}/cancel`)。
  - app-state 缓存 TTL 5s；`api_server_reload_config` 手动失效。

## 文档解析（`commands/fs.rs::read_file`，`spawn_blocking`）

| 格式 | 抽取器 / 库 |
|------|------------|
| PDF | pdfium-render（FFI，探测平台 libpdfium 路径） |
| DOCX / DOC | docx-rs / office_oxide |
| PPTX / ODS/ODT / XLS(X) | zip 解析 / calamine |
| EPUB / MOBI | epub / mobi（仅无 DRM，panic 被捕获） |
| Org-mode | 自研转 Markdown |

写入：`write_file_atomic` 用 temp→rename；记 file_history 快照；标记 app-write 路径避免回环处理；
`create_missing_wiki_page` 落到 `wiki/concepts/`，路径 canonicalize 校验限定项目内。

## MCP
`mcp_server_entry_path()` 在 dev/打包多种布局下解析 `mcp-server/dist/src/index.js`；三平台 bundle
均含 mcp-server 资源。

> 命令、Agent 工具、服务端点的**任何改动**请同步本页。
