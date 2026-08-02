# 06 · 本 fork 定制（Lluren Wiki vs 上游）

[← 返回索引](README.md)

本页记录 `Llurencom/llm_wiki` 相对上游 `nashsu/llm_wiki` 的**所有定制**。新增定制请追加到这里。

## 设计哲学

- **意图驱动 / WYSIWYG（所见即所得）**：界面元素默认隐藏，只有当应用状态**需要**它时才出现。
  例：仅当存在 review/lint 待办时，侧栏才显示 Tasks 图标与计数徽标。
- 目标：降低认知负担，让**对话 + 知识库**成为主入口，其余为按需探索。

## 1. 两级图标导航（CORE + MORE）+ 左侧目录按视图专属

**位置**：`src/components/layout/icon-sidebar.tsx`、`src/components/layout/sidebar-panel.tsx`、
`src/components/layout/content-area.tsx`。
- `CORE_ITEMS`：**对话(Chat)、知识库(Wiki)**（常驻）。知识库是用户"知识/经验分身"的成果，
  与对话（积累+使用两条核心业务的入口）并列为两个一等入口。
- `MORE_ITEMS`：**文件(Sources)**（收进"⋯"菜单）+ 扫描质量（直达 Lint）。Skills 已移入设置。
- **搜索 / 图谱已并入知识库视图**（`KnowledgeView`，见 [05 §D/§E](05-features.md)）：知识库视图含
  「**关系图谱 | 搜索**」并列 Tab（默认图谱，store `wikiMode` 驱动），不再有独立导航项。点知识库即默认
  看到关系图谱；搜索与图谱为并列的两个浏览面。
- 底部条件项：Tasks（有待办才出现）、Daemon 状态、Settings（有更新红点）、Switch Project。
- **配套 IA 改造**（`sidebar-panel.tsx`）：原左侧目录是"知识+文件"**混合双 Tab**，导致点"原始资料"
  时知识库与文件混在一起。现已**去掉双 Tab**，改为**按 `activeView` 驱动**——
  知识库及其他知识语境视图（search/graph/todos/review/lint）显 `<KnowledgeTree>`，
  文件（sources）显 `<FileTree>`，二者不再共用一个面板（彻底分开）。
- i18n：`nav.wiki`="知识库"/"Knowledge"，`nav.sources`="文件"/"Files"。
- **理由**：核心业务=对话（①导入/对话积累知识 ②对话使用知识）；知识库是核心成果，须一等公民；
  文件/搜索/图谱/Skills/质检为非核心，收进 More。

## 2. 统一待办中心（Review + Lint 两 Tab）

**位置**：`src/components/todos/todos-view.tsx`（+ `review-view.tsx` / `lint-view.tsx`）。
- 上游为分开的 Review、Lint 视图；本 fork 合并为单一 "Tasks"，Tab 切换。
- `wiki-store.todosInitialTab`（`"review"|"lint"|null`）实现**一次性 Tab 预选**。
- **理由**：两者都是"我要处理的任务"，减少导航项。

## 3. 预览返回导航（语义化返回）

**位置**：`src/stores/wiki-store.ts`（`previewReturnView` 字段 + `openPathInPreview` /
`openFileInPreview` / `closePreview`）、`src/components/layout/preview-panel.tsx`。
- 从 search / todos 点条目打开全宽 wiki 预览时，记录来源视图；关闭时**回到来源列表**而非空白页，
  并在预览面板显示醒目「返回 [来源]」按钮（在关闭 X 之前）。
- **理由**：从搜索/待办探索页面后不"迷路"。

## 4. 知识库预览区的「搜索页面」入口（原 Chat 查找页面按钮，已迁移）

**位置**：`src/components/layout/preview-panel.tsx`（header 始终渲染，含 Search 按钮，点击
`useWikiStore.getState().setActiveView("search")`）。
- 早期本 fork 把「查找页面」按钮放在 Chat 输入栏（`chat-input.tsx` 的 `onFindPages`）。
  但"搜知识库页面"属于知识库（wiki）范畴，放对话框里语义错位，已于本次改动**从 Chat 移除**，
  改为在 **wiki 预览面板 header**（`PreviewPanel`）常驻一个「搜索页面」按钮。
- `PreviewPanel` 因此重构：header 不再因无选中文件而早退（原空态早退导致 header 不渲染），
  改为 header 始终显示（无文件时标题显示 `preview.selectFile` 占位），空态降级为 body。
- i18n：新增 `preview.searchPages` / `preview.searchPagesHint`；旧的 `chat.findPages` /
  `chat.findPagesHint` 已删除。
- **理由**：搜索入口归位到它服务的知识库视图，符合"功能出现在它所属的语境里"。

## 4b. Chat 输入栏精简（去掉向外的开关）

**位置**：`src/components/chat/chat-input.tsx`、`chat-panel.tsx`。
- 从 Chat 输入栏底部工具栏**移除**三个控件：**添加图片**（`ImagePlus` 按钮 + 隐藏 file input +
  `handleFilePick`）、**Web 搜索**（`Globe2` 开关）、**AnyTxt 搜索**（`FileSearch` 开关 + Tooltip）。
- 保留：**Skills**、**检索模式**、**Agent 模式**。
- 图片能力**未完全删除**：粘贴（`handlePaste`→`addFiles`）、`images` 状态、预览/移除、视觉发送
  管道仍在，只是不再有显式附件按钮（WYSIWYG：用不到就不占位）。
- `useWebSearch` / `useAnyTxtSearch` 的 store 字段与 send 管道保留（默认 false），仅移除 UI 开关；
  对应 `onUseWebSearchChange` prop 与 `setUseWebSearch` 声明已清理。
- **理由**：本平台定位是**向内**的个人知识分身；联网 Web 搜索、AnyTxt 外部索引属"向外"能力，
  默认收起可降低认知负担，对齐"核心业务是对话问知识库"。

## 5. "扫描质量"直达 Lint

**位置**：`icon-sidebar.tsx`（More 菜单项）。点它先 `setTodosInitialTab("lint")` 再进 Tasks。
- **理由**：一键结构质检；lint 偏结构，review 偏知识。

## 6. 状态感知空态（State-aware empty states）

**位置**：`chat-panel.tsx` 等各处。空项目→"导入来源"CTA；空对话→建议先加来源；空搜索→给出指引。
- **理由**：新用户体验更友好。

## 7. 品牌 "Lluren Wiki"

统一改名（**用户可见处必须为 "Lluren Wiki"**）：

| 位置 | 值 |
|------|----|
| `src-tauri/tauri.conf.json` | `productName: "Lluren Wiki"`，窗口 `title: "Lluren Wiki"` |
| `src-tauri/tauri.windows.conf.json` | 补 `"title": "Lluren Wiki"`（修复 Windows 标题栏回退 "Tauri App"） |
| `src-tauri/Cargo.toml` | `[[bin]] name = "Lluren-Wiki"`（修复 dev 任务栏 exe 名） |
| `index.html` | `<title>Lluren Wiki</title>` |
| 前端文案 / i18n | 相关字符串改为 Lluren Wiki |

> **易错点**：Windows 上 `tauri.windows.conf.json` 会覆盖基座；若只改基座 title，Windows 标题栏
> 仍显示 "Tauri App"。任务栏名称在 dev 下取 exe 名，故需改 `[[bin]] name`。

## 与上游的关系

- 保留上游全部核心：Milkdown 编辑器、ingest 两步式流程、图谱/社区发现、LLM 集成、本地服务、
  浏览器扩展、多格式解析等。
- 本 fork 的差异集中在 **UX 打磨（导航/返回/空态/入口）** 与 **品牌标识**，尽量不改后端逻辑，
  以降低与上游合并的冲突面。
- 上游同步记录见 [07-development.md](07-development.md#上游同步)；最近一次合并到 **v0.6.6**。

## 定制文件清单（改动时优先检查）

```
src/components/layout/icon-sidebar.tsx     # 两级导航(CORE=对话/知识库) + 扫描质量
src/components/layout/sidebar-panel.tsx    # 去混合双Tab，按 activeView 驱动(知识树/文件树)
src/components/layout/preview-panel.tsx    # 返回导航按钮 + 搜索页面入口（header 常驻）
src/components/todos/todos-view.tsx        # 统一待办 Tab
src/components/chat/chat-input.tsx         # 精简工具栏（见 §4b）
src/stores/wiki-store.ts                   # previewReturnView / todosInitialTab
src-tauri/tauri.conf.json                  # productName / title / version
src-tauri/tauri.windows.conf.json          # Windows title
src-tauri/Cargo.toml                       # [[bin]] name
index.html                                 # <title>
```
