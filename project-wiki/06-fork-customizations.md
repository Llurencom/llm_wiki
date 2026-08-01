# 06 · 本 fork 定制（Lluren Wiki vs 上游）

[← 返回索引](README.md)

本页记录 `Llurencom/llm_wiki` 相对上游 `nashsu/llm_wiki` 的**所有定制**。新增定制请追加到这里。

## 设计哲学

- **意图驱动 / WYSIWYG（所见即所得）**：界面元素默认隐藏，只有当应用状态**需要**它时才出现。
  例：仅当存在 review/lint 待办时，侧栏才显示 Tasks 图标与计数徽标。
- 目标：降低认知负担，让 Chat 与 Sources 成为主入口，其余为按需探索。

## 1. 两级图标导航（CORE + MORE）

**位置**：`src/components/layout/icon-sidebar.tsx`。
- `CORE_ITEMS`：Chat、Sources（常驻）。
- `MORE_ITEMS`：Search、Wiki、Graph、Skills（收进"⋯"菜单）。
- 底部条件项：Tasks（有待办才出现）、Daemon 状态、Settings（有更新红点）、Switch Project。
- **理由**：精简侧栏，主次分明。

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

## 4. Chat 里的「查找页面」按钮

**位置**：`src/components/chat/chat-input.tsx`（onFindPages 按钮）、`chat-panel.tsx` 传入
`onFindPages={() => useWikiStore.getState().setActiveView("search")}`。
- Chat 输入栏醒目的 Search 图标按钮，不离开 Chat 直接跳到搜索。
- **理由**：把"找页面"提升为一等操作，与"提问"平级。

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
src/components/layout/icon-sidebar.tsx     # 两级导航 + 扫描质量
src/components/layout/preview-panel.tsx    # 返回导航按钮
src/components/todos/todos-view.tsx        # 统一待办 Tab
src/components/chat/chat-input.tsx         # 查找页面按钮
src/stores/wiki-store.ts                   # previewReturnView / todosInitialTab
src-tauri/tauri.conf.json                  # productName / title / version
src-tauri/tauri.windows.conf.json          # Windows title
src-tauri/Cargo.toml                       # [[bin]] name
index.html                                 # <title>
```
