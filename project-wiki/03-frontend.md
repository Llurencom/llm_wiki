# 03 · 前端（src/）

[← 返回索引](README.md)

## 目录结构

```
src/
├── components/     UI 组件（按功能域分子目录）
│   ├── layout/     三栏布局、图标栏、预览面板、研究/活动面板
│   ├── chat/       对话面板、输入框、消息渲染
│   ├── editor/     Milkdown 编辑器、多格式预览、frontmatter、历史、链接面板
│   ├── graph/      sigma 图谱视图 + 布局 worker
│   ├── todos/ review/ lint/   待办中心与两个子队列
│   ├── sources/    来源树 + 导入 UI
│   ├── search/     搜索视图
│   └── settings/   设置各分区
├── stores/         Zustand 状态（见下）
├── lib/            业务逻辑（175+ 文件，见下）
├── i18n/           zh.json / en.json / index.ts + parity 测试
└── App.tsx         根组件
```

## 顶层视图（`useWikiStore().activeView`）

| view | 组件 | 用途 |
|------|------|------|
| `chat` | ChatPanel | RAG 问答、Web 搜索、Agent 技能 |
| `wiki` | PreviewPanel | wiki 页面查看/编辑（预览模式可全宽） |
| `sources` | SourcesView | 原始来源树 + 导入 |
| `search` | SearchView | 全文 + 向量搜索结果 |
| `graph` | GraphView | 知识图谱可视化与分析 |
| `lint` / `review` | LintView / ReviewView | 结构 / 知识质量队列（也聚合进 todos） |
| `todos` | TodosView | Review + Lint 两 Tab 聚合面（fork） |
| `skills` | SkillsSection | Agent 技能浏览/编辑 |
| `settings` | SettingsView | 配置 UI |

## 布局组件（`src/components/layout/`）

- **AppLayout** (`app-layout.tsx`)：三栏可拖拽布局；据 `activeView` 由
  `app-layout-visibility.ts` 决定左右面板显隐（Settings/Chat 隐藏左右；Sources 隐藏右）。
- **IconSidebar** (`icon-sidebar.tsx`)：竖向导航，**两级**（fork 定制）：
  - `CORE_ITEMS`：Chat、Sources（常驻）。
  - `MORE_ITEMS`：Search、Wiki、Graph、Skills（"⋯"菜单）。
  - 底部条件项：Tasks（仅当有 review/lint 待办时出现）、Daemon 状态、Settings（有更新时红点）、
    Switch Project；顶部 Deep Research（Globe）切右侧面板。
- **PreviewPanel** (`preview-panel.tsx`)：加载/自动保存编排；`previewReturnView` 存在时显示醒目
  「返回 [来源]」按钮（fork）。
- **ResearchPanel / ActivityPanel**：右侧 Deep Research 任务与实时导入活动日志。

## Zustand Stores（`src/stores/`）

### wiki-store.ts（核心）
项目、文件树、选中文件与内容、`activeView`、全部 LLM/搜索/embedding/multimodal/mineru/
sourceWatch/scheduledImport/api/graphUiState 配置，以及 `dataVersion`（切项目时使缓存失效）。
- 关键 action：`setProject/setFileTree/setSelectedFile/setFileContent`、`setActiveView`。
- **fork 定制字段**：
  - `previewReturnView`：记录是哪个视图打开了全宽预览，关闭时回到它（语义化返回）。
  - `todosInitialTab: "review"|"lint"|null`：一次性预选 Tasks 的 Tab（"扫描质量"直达 lint）。
- **fork 定制 action**：`openPathInPreview/openFileInPreview`（记录来源视图并切到 wiki）、
  `closePreview`（回到 `previewReturnView` 或 wiki）、`setTodosInitialTab`。

### chat-store.ts
`conversations` / `activeConversationId` / `messages`；`isStreaming` / `streamingContent`；
`mode: chat|ingest`；开关 `useWebSearch/useAnyTxtSearch/agentMode/retrievalMode`；
`selectedSkills/selectedContextFiles/disabledSkills`。
- 消息 `DisplayMessage`：`role/content/references?/agentSteps?/agentFileChanges?/userInputRequest?/images?`。
- action：`createConversation/setActiveConversation/addMessage/setStreaming/appendStreamToken/finalizeStream`。

### review-store.ts / lint-store.ts
- **Review**：`items: ReviewItem[]`；type = contradiction|duplicate|missing-page|confirm|suggestion；
  ID = FNV-1a(type+归一化标题)（确定性，重复 ingest 稳定）；持久化 `.llm-wiki/review.json`。
- **Lint**：`items: LintItem[]`；type/severity（error/warning/info）；broken-link/orphaned-page 等；
  持久化 `.llm-wiki/lint.json`。聚合计数见 `lib/todos.ts`（`useTodoTotalPending` 等，驱动侧栏徽标）。

### 其他 store
`research-store`（Deep Research 任务队列 + 面板显隐 + 并发上限）、`activity-store`（导入/agent 活动日志）、
`update-store`（版本检查状态）、`zoom-store`（UI 缩放，持久化）、`file-sync-store`（文件监听状态）。

## 核心 lib 模块（`src/lib/`，节选）

| 文件 | 作用 |
|------|------|
| `ingest.ts` | 导入主流程：解析→分析→生成→enrich→去重（`withProjectLock` 串行） |
| `lint.ts` | 结构检查：断链、孤儿页、缺失回链 |
| `search.ts` | 关键词分词（含 CJK bigram）+ 调后端全文/向量搜索 |
| `embedding.ts` / `text-chunker.ts` | 取向量、切块、upsert 到 LanceDB |
| `llm-client.ts` | 流式对话；处理 token/超时 |
| `llm-providers.ts` / `llm-task-routing.ts` | 各家 provider 适配；Chat/Ingest 分模型路由 |
| `web-search.ts` / `deep-research.ts` | Web 搜索 API；多轮检索+综合 |
| `wiki-graph.ts` / `graph-insights.ts` / `graph-filters.ts` | 建图、洞察、过滤 |
| `wiki-page-resolver.ts` / `enrich-wikilinks.ts` | wikilink→路径解析（模糊匹配）；LLM 注入链接 |
| `persist.ts` / `auto-save.ts` / `project-store.ts` | 读写 `.llm-wiki/`；防抖保存；项目配置 |
| `scheduled-import.ts` / `clip-watcher.ts` | 定时扫描导入；剪藏守护健康检查 |
| `context-budget.ts` / `connection-tests.ts` | 上下文预算；端点连通性校验 |
| `chat-save-to-wiki.ts` / `sweep-reviews.ts` | 对话导出为 wiki 页；创建缺失页后自动清理 review |

## i18n（`src/i18n/`）
- 嵌套 JSON，key 映射 UI 区域（`nav.*`、`chat.*` …）。
- **强约束**：`i18n-parity.test.ts` 校验 `en.json` ⊇ `zh.json`，缺 key 则测试失败。
  **新增任何文案都必须同时加到 zh 与 en。**
- 用法：`const { t } = useTranslation(); t("nav.chat")`。

> 组件/store/lib 的**新增或改动**，请同步更新本页对应小节。
