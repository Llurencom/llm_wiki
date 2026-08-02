import { useTranslation } from "react-i18next"
import { PanelLeftClose } from "lucide-react"
import { useWikiStore } from "@/stores/wiki-store"
import { KnowledgeTree } from "./knowledge-tree"
import { FileTree } from "./file-tree"

interface SidebarPanelProps {
  onCollapse?: () => void
}

export function SidebarPanel({ onCollapse }: SidebarPanelProps) {
  const { t } = useTranslation()
  const activeView = useWikiStore((s) => s.activeView)
  // View-driven tree: 知识库 (and other knowledge-context views such as
  // search / graph / todos) show the curated KnowledgeTree; 文件 (sources)
  // shows the project FileTree. The old mixed Knowledge/Files tab strip is
  // gone — each view owns its tree so the two never share one panel. This is
  // the core IA change: 知识库 is separated out, 文件 lives under More.
  const showFiles = activeView === "sources"
  const label = showFiles ? t("sidebar.files") : t("sidebar.knowledge")

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            className="flex w-7 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t("layout.hideSidebar", "Hide sidebar")}
            aria-label={t("layout.hideSidebar", "Hide sidebar")}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        {showFiles ? <FileTree /> : <KnowledgeTree />}
      </div>
    </div>
  )
}
