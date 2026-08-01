# Lluren Wiki — 项目开发 Wiki

> 本目录是 **Lluren Wiki** 项目的开发者知识库（Developer Wiki），用于系统化记录项目的
> 逻辑、功能、架构与实现方式。它面向维护者与 AI 协作者，是理解与修改本项目的**知识基线**。
>
> 注意：这里说的 "Wiki" 指**本仓库的开发文档**，与应用运行时为用户生成的知识库
> （用户项目里的 `wiki/` 目录）是两回事。

Lluren Wiki 是 [`nashsu/llm_wiki`](https://github.com/nashsu/llm_wiki) 的一个 fork：一个基于
**Tauri 2 + React 19** 的跨平台桌面应用，核心理念是让 LLM **增量构建并持续维护**一份结构化、
互链的个人知识库（wiki），而不是每次查询都从原始文档里临时检索（传统 RAG）。

## 📑 页面导航

| 页面 | 内容 |
|------|------|
| [01-overview.md](01-overview.md) | 项目定位、核心理念、技术栈、运行时数据布局 |
| [02-architecture.md](02-architecture.md) | 整体架构、前后端边界、数据流、关键设计模式 |
| [03-frontend.md](03-frontend.md) | 视图、Zustand stores、布局组件、核心 lib 模块 |
| [04-backend.md](04-backend.md) | Tauri 配置、Cargo、启动流程、命令面、Agent 运行时、本地服务、文档解析 |
| [05-features.md](05-features.md) | 各功能模块深入：Chat/RAG、导入、搜索、图谱、待办、编辑器、设置 |
| [06-fork-customizations.md](06-fork-customizations.md) | 本 fork 相对上游的所有定制与品牌改动 |
| [07-development.md](07-development.md) | 构建/测试/类型检查、i18n 校验、应用标识、上游同步与提交规范 |

## ⚠️ 维护规则（必须遵守）

**每次功能变更，都必须同步更新本 Wiki。** 这是本项目的硬性约定：

1. **改动前**：先阅读相关 Wiki 页面，充分理解现有功能、实现方式与架构，再动手。
2. **改动后**：更新受影响的 Wiki 页面——
   - 新增/修改**视图或组件** → 更新 [03-frontend.md](03-frontend.md)。
   - 新增/修改 **Zustand store 字段或 action** → 更新 [03-frontend.md](03-frontend.md) 对应 store 小节。
   - 新增/修改 **Tauri 命令、Agent 工具、本地服务** → 更新 [04-backend.md](04-backend.md)。
   - 新增/修改**功能行为** → 更新 [05-features.md](05-features.md)。
   - 相对上游的**新定制** → 记入 [06-fork-customizations.md](06-fork-customizations.md)。
   - 新增依赖、脚本、构建/测试流程变化 → 更新 [07-development.md](07-development.md)。
3. **上游同步（merge upstream）后**：核对被合入的改动是否影响上述任一页面，并补齐。
4. **文件路径与函数名**：Wiki 里引用代码时尽量带上真实路径（如 `src/stores/wiki-store.ts`），
   方便定位；重构移动文件时一并更新引用。

> 目标：让任何人（或 AI）在动手改代码前，都能通过本 Wiki 快速、准确地理解"这个功能是什么、
> 在哪里实现、怎么串起来的"。

## 🗂️ 一句话速览

- **界面**：三栏布局（左侧文件/知识树 · 中间视图 · 右侧研究面板），左侧图标栏在
  Core（Chat/Sources）与 More（Search/Wiki/Graph/Skills）两级间切换。
- **导入（Ingest）**：文档 → 解析 → LLM 分析 → 生成互链 wiki 页面 → 注入 wikilink → 去重 →
  生成 Review 待办。两步式 CoT（先分析后生成），带 SHA256 增量缓存与持久化队列。
- **检索（RAG）**：关键词 + 向量（LanceDB）+ 图关联，RRF 融合排序；受上下文预算约束。
- **Chat**：多会话、流式、Web 搜索、Agent 技能、视觉输入；Agent 运行时在 **Rust 侧**。
- **图谱**：sigma.js 可视化、Louvain 社区发现、洞察（惊喜连接 / 知识缺口）。
- **待办中心（Tasks）**：Review（知识质量）+ Lint（结构问题）两个 Tab 聚合。
- **本地服务**：clip_server（浏览器剪藏，19827）+ api_server（外部 REST/MCP，19828）。

各条目的详细实现见对应页面。
