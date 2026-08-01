# 02 · 整体架构

[← 返回索引](README.md)

## 分层视图

```
┌─────────────────────────────────────────────────────────────┐
│  前端 (React 19 + TS, src/)                                   │
│  · 视图 (chat/wiki/sources/search/graph/todos/skills/settings)│
│  · Zustand stores (wiki / chat / review / lint / research …)  │
│  · lib/ 业务逻辑 (ingest, search, embedding, llm-client …)    │
└───────────────▲───────────────────────────┬──────────────────┘
        Tauri invoke (IPC)                   │ 事件 (agent-event 流)
┌───────────────┴───────────────────────────▼──────────────────┐
│  后端 (Rust + Tauri 2, src-tauri/src/)                        │
│  · commands/  ~50 个 #[tauri::command] (FE↔BE 契约)           │
│  · agent/     Agent 运行时 (runtime/provider/tools/router …)  │
│  · api_server.rs (:19828 REST/MCP)  clip_server.rs (:19827)   │
│  · vectorstore (LanceDB)  fs (多格式解析)                     │
└──────────────────────────────────────────────────────────────┘
        │ HTTP                    │ 子进程/FFI
   LLM / 搜索 / embedding    Claude·Codex CLI · pdfium · office 解析
```

## 前后端边界（关键契约）

- 前端**不直接**做文件系统、文档解析、向量库、Agent 执行——全部通过 Tauri `invoke` 调用
  `src-tauri/src/commands/*` 与 `lib.rs` 暴露的 `#[tauri::command]`。命令清单见
  [04-backend.md](04-backend.md#tauri-命令面)。
- **Agent 运行时在 Rust 侧**（`src-tauri/src/agent/`）。桌面 UI、本地 HTTP API、MCP 三个入口
  复用同一套 `AgentRuntime`。
- 流式对话：`agent_start_turn_stream` 启动后，后端通过 app handle 发 `agent-event` 事件，
  前端 `chat-store` 消费并累积 `streamingContent`。
- 文件抽象层：`src/commands/fs.ts`（前端）包一层，所有文件操作走它，便于测试 mock。

## 典型数据流

### 导入（Ingest）
```
用户拖入文件 → raw/sources/
  → fs.read_file (Rust 解析: PDF/Office/EPUB/…)
  → lib/ingest.ts: 加项目锁 → 查 SHA256 缓存
  → LLM 第1步「分析」(实体/概念/矛盾/结构建议)
  → LLM 第2步「生成」(来源摘要 + 概念/实体页 + 更新 index/overview/log)
  → 抽取 PDF 图片 → 视觉模型生成图注
  → enrich-wikilinks 注入 [[链接]]
  → 去重合并 → 生成 Review 待办 → 可选自动 embedding
```
详见 [05-features.md#导入](05-features.md#a-导入-ingest)。

### 检索 / RAG
```
Chat 提问 → search_project (Rust)
  → 关键词(BM25 式) + 向量(LanceDB) + 图关联 融合(RRF)
  → context-budget 裁剪到模型上下文窗口
  → 作为上下文交给 LLM → 流式回答 + references[]
```

### 预览返回导航（fork 定制）
```
在 search/todos 中点条目 → openPathInPreview(path)
  → 记住来源视图到 previewReturnView, activeView="wiki"
  → 预览面板显示醒目「返回 [来源]」按钮
  → closePreview() → 回到 previewReturnView
```
详见 [06-fork-customizations.md](06-fork-customizations.md)。

## 关键设计模式

| 模式 | 位置 | 作用 |
|------|------|------|
| **小而专注的 Zustand store** | `src/stores/*` | 按域拆分，无巨型 store；store 内无副作用 |
| **瞬态 vs 持久状态** | wiki-store | `activeView`/`previewReturnView`/`todosInitialTab` 瞬态；项目配置、对话、review/lint 持久化到磁盘 |
| **项目锁互斥** | `withProjectLock()` (ingest.ts) | 串行化并发导入，避免读写 `wiki/index.md` 竞态 |
| **自动保存防抖** | `lib/auto-save.ts` | 击键 1s 防抖，失焦/显式保存立即落盘；切项目时挂起防丢数据 |
| **上下文预算** | `lib/context-budget.ts` | 估算 token，裁剪消息以适配窗口 |
| **导入/去重后台队列** | ingest 相关 | 批处理、持久化、启动时恢复未完成任务、失败重试(最多3次) |
| **Panic 隔离** | `src-tauri/src/panic_guard.rs` | release 用 `panic="unwind"`，FFI/解析器 panic 转 Err 不崩溃 |
| **异步/阻塞分离** | `spawn_blocking()` | PDF/Office 解析可能阻塞数秒，放阻塞线程池 |
| **原子写 + 历史** | `write_file_atomic` / file_history | temp→rename；每次写入记快照供回滚 |
| **项目边界约束** | fs.rs | 所有路径 canonicalize 后校验仍在项目根内，防越界 |
| **确定性 Review ID** | review-store | type+标题 的 FNV-1a 哈希，重复 ingest 得到同 ID，便于外部 resolve |

## 平台差异（三处配置合并）

`tauri.conf.json`（基座）会被 `tauri.{windows,macos,linux}.conf.json` **覆盖合并**：
- Windows：`titleBarStyle: Visible` + `hiddenTitle: false`（原生标题栏）；本 fork 在此补了
  `"title": "Lluren Wiki"`，否则回退成 "Tauri App"。
- macOS/Linux：透明/隐藏标题栏；各自打包对应的 pdfium 动态库与 mcp-server 资源。

详见 [04-backend.md](04-backend.md) 与 [06-fork-customizations.md](06-fork-customizations.md)。
