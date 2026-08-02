# 05 · 功能模块

[← 返回索引](README.md)

> 逐功能说明"做什么 / 涉及文件 / 关键行为"。改功能时同步本页。

## A. 导入（Ingest）

**做什么**：把文档转成互链 wiki 页面。**文件**：`src/components/sources/*`、`src/lib/ingest.ts`、
`source-lifecycle.ts`、`source-import-actions.ts`（共享的"选文件/选文件夹→导入"入口）、`mineru.ts`、
`extract-source-images.ts`、`image-caption-pipeline.ts`；后端 `commands/fs.rs`。

**导入入口**（均复用同一管线 `importSourceFiles`/`importSourceFolder`，过滤常量集中在
`IMPORT_FILE_FILTERS`，避免两处漂移）：
- 文件(Sources) 视图的导入按钮。
- **侧栏「文件导入」入口**（`IconSidebar`，位于知识库下方）：点开后选"导入文件/导入文件夹"，导入完成后跳到
  文件(Sources) 视图展示刚导入的资料。数据导入是核心业务，该入口只是薄封装，不另起实现。

**流程**（两步式 CoT）：
1. 导入文件/文件夹到 `raw/sources/`（支持递归文件夹，路径作为分类上下文）。
2. 解析（PDF→MinerU/pdfium，HTML→Turndown，其余→纯文本）。
3. **第1步 分析**：LLM 抽取实体/概念/论点、与现有 wiki 的联系与矛盾、结构建议。
4. **第2步 生成**：写来源摘要 + 概念/实体页 + 更新 `index/overview/log`。
5. 抽取 PDF 图片 → 视觉模型生成图注。
6. `enrich-wikilinks` 注入 `[[链接]]`。
7. 与现有页去重合并；生成 Review 待办；可选自动 embedding。

**关键行为**：`withProjectLock` 串行；**SHA256 增量缓存**跳过未变文件；持久化队列、失败重试≤3；
每页 frontmatter 带 `sources: []`（可追溯）；语言可配置；保证总有来源摘要页（兜底）。

**Source Watch / 定时导入**：`raw/sources/` 变更自动拾取；`scheduled-import.ts` 周期扫描，
记录上次扫描时间（Windows 路径大小写不敏感处理已在 v0.6.6 修复）。

## B. Chat（RAG 问答）

**文件**：`src/components/chat/*`、`src/lib/llm-*.ts`、`web-search.ts`；Agent 在 Rust 侧。

- 多会话线程、流式、markdown 渲染、引用页 `references[]`、Agent 步骤与文件改动展示、视觉输入
  （PNG/JPEG/WebP/GIF ≤20MB，每条≤5 张，需视觉模型；**仅粘贴**，无显式附件按钮）。
- 工具栏开关（本 fork 精简后）：**Skills**、**检索模式**、**Agent 模式**。
  （Web 搜索 / AnyTxt / 添加图片按钮已从 Chat 移除，见 [06 §4b](06-fork-customizations.md)；
  `useWebSearch`/`useAnyTxtSearch` 仍存在于 store 与 send 管道，默认 false。）
- **Agent 模式**：standard / fast / local_first。
- **检索模式**：standard（关键词+向量 RRF）/ smart（重排）/ faithful（高精度严格引用）。
- **搜索页面入口**：已从 Chat 迁移到 **wiki 预览面板 header**（`PreviewPanel` 常驻「搜索页面」按钮，
  点击 `setActiveView("search")`，见 [06 §4](06-fork-customizations.md)）。
- LLM 传输：`llm-client.ts` 流式；支持 HTTP 各家 + Claude/Codex CLI + OpenAI 兼容/Anthropic wire。

## C. Wiki 预览 / 编辑

**文件**：`src/components/editor/*`、`layout/preview-panel.tsx`、`lib/frontmatter.ts`。

- Milkdown 所见即所得（GFM 表格/任务列表、`remark-math`+`rehype-katex` 数学、Mermaid 图）。
- 多格式查看：`file-preview.tsx`（文本/markdown/PDF via pdfjs-dist/图片）。
- Frontmatter 面板、文件历史面板、页面链接（正向/反向链接）面板。
- **选区级 AI**："对选中内容提问/改写/解释"，词级 diff，源文件变化时可撤销防误覆盖。
- **自动保存**：击键 1s 防抖，失焦/显式立即存，跳过无变更，切项目时挂起。

## D. 搜索

**文件**：`src/components/search/*`、`src/lib/search.ts`、`embedding.ts`、`anytxt-search.ts`；
后端 `commands/search.rs`。

- **入口**：搜索现在是**知识库（wiki）视图的一个并列 Tab**（`KnowledgeView` 的「搜索」页，由 store
  `wikiMode="search"` 驱动），不再有独立导航项。预览面板 header 的「搜索页面」按钮、知识库 Tab 切换
  都通过 `setWikiBrowseMode("search")` 进入。
- 关键词（分词 + 停用词 + CJK bigram）、向量（需配 embedding 端点）、混合（RRF 融合）。
- 结果可：打开全宽预览（`openFileInPreview` → `wikiMode="preview"`，关闭回到搜索 Tab）、跳转到某图片（`pendingScrollImageSrc`）。
- Embedding 配置：端点/模型、切块（目标 1000、上限 1500、重叠 200）、并发/批量可调。

## E. 图谱

**文件**：`src/components/graph/*`、`lib/wiki-graph.ts`、`graph-insights.ts`、`graph-filters.ts`、
`graph-search.ts`、`graph-layout-worker.ts`。

- **入口**：图谱是**知识库视图的默认并列 Tab**（`KnowledgeView` 的「关系图谱」页，`wikiMode="graph"`，
  进入知识库即默认显示），不再有独立导航项。
- sigma.js 画布；节点类型（概念/实体/来源/查询/综合/综述）；ForceAtlas2 / Web Worker 布局。
- **Louvain 社区发现**；按类型或社区着色；过滤、缩放、节点大小调节。
- **洞察**：惊喜连接（低度节点的 2-hop 路径）、知识缺口（孤立簇）。
- 点节点在图谱内置侧栏预览页面（`GraphPreviewPanel`，不走 `wikiMode="preview"`）。

## F. 待办中心（Tasks = Review + Lint，fork 聚合）

**文件**：`src/components/todos/*`、`review/*`、`lint/*`、`lib/todos.ts`。

- 单一入口，两 Tab；`todosInitialTab` 一次性预选（"扫描质量"直达 lint）。
- **Review**：矛盾/重复/缺页/确认/建议；按类型给不同解决选项（如重复→合并页）；`.llm-wiki/review.json`。
- **Lint**：断链/孤儿页/缺文件引用等；error/warning/info；自动修复或人工；`.llm-wiki/lint.json`。
- 侧栏 Tasks 图标与徽标仅在有待办时出现（WYSIWYG，见 [06](06-fork-customizations.md)）。

> **已移除**：早期上游版本含"Deep Research（联网深度研究）"功能——下课题、后台联网搜索并综合成
> wiki 页。本 fork 已**彻底删除**该功能（前端面板/store/lib、Agent 的 `deep_research.run` 工具与
> `AgentMode::Deep`、项目模板里的研究化脚手架），因为它与 Lluren Wiki 的定位相悖：本平台是**向内**沉淀
> 你自己的知识/经验/经历/生活的「个人知识分身」，**不做向外的联网研究**（见 [README 平台定位红线](README.md)）。
> 从上游合并时不要再合回这部分内容。

## H. 浏览器剪藏（Web Clipper）

**文件**：`extension/`（Manifest V3，Readability.js + Turndown.js）+ 后端 `clip_server.rs`。
扩展经 `http://127.0.0.1:19827` 发送剪藏；热键 Alt/Cmd+Shift+L。健康检查见 `lib/clip-watcher.ts`。

## I. 设置

**文件**：`src/components/settings/*`、`lib/project-store.ts`、`llm-providers.ts`、`preset-resolver.ts`。
分区：LLM（provider/模型/key/上下文/推理）、Provider 预设、搜索、Embedding、MinerU、图注、代理、
本地 API 服务、关于/更新、Skills、通用（自启动/关闭行为/缩放）。
配置存 `.llm-wiki/app-state.json`；每预设 override 独立存（便于轮换 key）。

**Skills 管理**（`src/components/settings/sections/skills-section.tsx` + 后端 `agent/skills.rs`）：
扫描 `.llm-wiki/skills`、`~/.claude/skills`、`~/.codex/skills`、`~/.agents/skills`，列出并可逐项
启用/禁用。支持**新增**（`agent_create_skill`：在项目 `.llm-wiki/skills/<id>.md` 写 frontmatter
`name`+`description`+指令正文，id 由名称 slug 化、校验、拒覆盖）与**删除**（`agent_delete_skill`：
按根目录优先解析并删除 `<id>.md` 或 `<id>/SKILL.md`，并清理 selectedSkills/disabledSkills 残留）。

## J. 本地 HTTP API + MCP + AI Agent Skill
见 [04-backend.md](04-backend.md#本地服务)。api_server(:19828) 暴露项目给外部 agent/脚本与 MCP；
可用一条命令把外部 AI agent 接入（详见根 README 对应章节）。
