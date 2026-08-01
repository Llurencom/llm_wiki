# 01 · 项目概览

[← 返回索引](README.md)

## 定位

**Lluren Wiki** 是一个"能自我构建"的个人知识库桌面应用。它把原始文档喂给 LLM，由 LLM
读取、抽取要点，并**增量地**写入 / 更新一份结构化、互链的 Markdown wiki，同时维护交叉引用、
标注矛盾、刷新综述。知识只"编译"一次并持续保持最新，而不是每次提问都重新检索拼接。

- 上游：[`nashsu/llm_wiki`](https://github.com/nashsu/llm_wiki)
- 本 fork：`Llurencom/llm_wiki`（品牌名 **Lluren Wiki**，见 [06](06-fork-customizations.md)）
- 当前版本：`0.6.6`（`src-tauri/tauri.conf.json` / `package.json` / `Cargo.toml`）

## 核心理念

> "Obsidian 是 IDE，LLM 是程序员，wiki 是代码库。"

- **三层数据模型**（用户项目内，运行时数据，非本仓库代码）：
  - **Raw sources**：用户导入的原始文档，**只读、不可变**，是事实来源。
  - **The wiki**：LLM 生成的 Markdown 页面（概念/实体/来源/综述/对比…），LLM 完全拥有。
  - **The schema/purpose**：`schema.md`（结构规则）+ `purpose.md`（目的/方向），指导 LLM 行为。
- **WYSIWYG 原则**（本 fork 强调）：界面元素默认隐藏，只有当应用状态需要时才出现
  （例如仅当存在 review/lint 待办时才显示 Tasks 图标）。

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面框架 | Tauri v2（Rust 后端） |
| 前端 | React 19 + TypeScript 5.7 + Vite |
| UI | shadcn/ui + Tailwind CSS v4 + Lucide 图标（锁定 1.7.x） |
| 编辑器 | Milkdown（基于 ProseMirror 的所见即所得 Markdown） |
| 状态管理 | Zustand 5 |
| 图谱 | sigma.js + graphology + ForceAtlas2 |
| 搜索 | 分词关键词 + 图关联 + 可选向量（LanceDB） |
| 向量库 | LanceDB（Rust，内嵌，可选） |
| 文档解析 | pdfium-render + MinerU（云/本地）+ docx-rs + calamine + EPUB/MOBI |
| i18n | react-i18next（zh / en，需保持 key 对齐） |
| LLM | 流式（OpenAI / Anthropic / Google / Azure / Ollama / 自定义 / Claude·Codex CLI） |
| Web 搜索 | Tavily / SerpApi / SearXNG / Brave / bocha / firecrawl |

> ⚠️ `lucide-react` 必须锁在 `^1.7.0`，误升级会导致 vite 无法解析入口、测试加载失败。

## 运行时数据布局（用户项目目录）

```
my-wiki/
├── purpose.md            # 目的、关键问题、研究范围
├── schema.md             # wiki 结构规则、页面类型
├── raw/
│   ├── sources/          # 导入的原始文档（不可变）
│   └── assets/           # 本地图片
├── wiki/
│   ├── index.md          # 内容目录
│   ├── log.md            # 操作历史
│   ├── overview.md       # 全局综述（每次 ingest 自动更新）
│   ├── entities/         # 人物 / 组织 / 产品
│   ├── concepts/         # 理论 / 方法 / 技术
│   ├── sources/          # 来源摘要
│   ├── queries/          # 保存的对话答案 + 研究
│   ├── synthesis/        # 跨来源综合
│   └── comparisons/      # 并列对比
├── .obsidian/            # Obsidian vault 配置（自动生成）
└── .llm-wiki/            # 应用配置、对话历史、review/lint 项
```

- `.llm-wiki/app-state.json`：应用配置（LLM/embedding/搜索/代理/API）。
- `.llm-wiki/review.json`、`.llm-wiki/lint.json`：待办项持久化。
- 生成页面的 YAML frontmatter 含 `sources: []`，回链到贡献它的原始文件（来源可追溯）。

## 仓库顶层结构（本代码库）

```
llm_wiki/
├── src/                  # React 前端（见 03）
├── src-tauri/            # Rust 后端 + Tauri 配置（见 04）
├── extension/            # 浏览器剪藏扩展（Manifest V3）
├── mcp-server/           # MCP 服务（Node，随包分发）
├── scripts/              # 构建/发布脚本
├── assets/ · logo.jpg    # README 图片资源
├── project-wiki/         # 👉 本开发 Wiki（tracked）
├── index.html            # <title>Lluren Wiki</title>
└── README*.md            # 多语言 README
```

> `docs/` 与 `AGENTS.md` 在 `.gitignore` 中被忽略，因此本 Wiki 放在 **tracked** 的
> `project-wiki/`，确保能随代码一起提交。
