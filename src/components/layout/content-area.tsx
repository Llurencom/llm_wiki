import { useEffect, useState } from "react"
import { Network, Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useWikiStore } from "@/stores/wiki-store"
import { ChatPanel } from "@/components/chat/chat-panel"
import { SettingsView } from "@/components/settings/settings-view"
import { SourcesView } from "@/components/sources/sources-view"
import { ReviewView } from "@/components/review/review-view"
import { LintView } from "@/components/lint/lint-view"
import { TodosView } from "@/components/todos/todos-view"
import { SearchView } from "@/components/search/search-view"
import { GraphView } from "@/components/graph/graph-view"
import { PreviewPanel } from "./preview-panel"

export function ContentArea() {
  const activeView = useWikiStore((s) => s.activeView)

  // Keep SourcesView mounted after its first visit. Opening a source uses the
  // full-width wiki preview, and unmounting the source tree here would discard
  // its scroll position, expanded folders, and incremental row limit. Hiding
  // the mounted view makes closing the preview a true return operation.
  const [hasMountedSources, setHasMountedSources] = useState(activeView === "sources")

  useEffect(() => {
    if (activeView === "sources") setHasMountedSources(true)
  }, [activeView])

  // Include the current view directly so the first navigation to Sources does
  // not wait for the effect above and briefly render an empty content area.
  if (hasMountedSources || activeView === "sources") {
    return (
      <>
        <div className={activeView === "sources" ? "h-full" : "hidden"}>
          <SourcesView />
        </div>
        {activeView !== "sources" && <ActiveContent activeView={activeView} />}
      </>
    )
  }

  return <ActiveContent activeView={activeView} />
}

function ActiveContent({
  activeView,
}: {
  activeView: ReturnType<typeof useWikiStore.getState>["activeView"]
}) {
  switch (activeView) {
    case "chat":
      return <ChatPanel />
    case "wiki":
      return <KnowledgeView />
    case "settings":
      return <SettingsView />
    case "sources":
      return null
    case "review":
      return <ReviewView />
    case "lint":
      return <LintView />
    case "todos":
      return <TodosView />
    case "search":
      return <SearchView />
    case "graph":
      return <GraphView />
    default:
      return <PreviewPanel />
  }
}

/**
 * The Knowledge (wiki) view. Hosts the relationship graph and the wiki
 * search as two parallel browse surfaces (graph is the default landing),
 * plus a transient page preview that takes over when a page is opened via
 * openPathInPreview / openFileInPreview (tree click, search result, todo
 * jump). The mode lives in the store (`wikiMode`) so external jumps and
 * the in-view tabs stay in sync.
 */
function KnowledgeView() {
  const { t } = useTranslation()
  const wikiMode = useWikiStore((s) => s.wikiMode)
  const setWikiBrowseMode = useWikiStore((s) => s.setWikiBrowseMode)

  if (wikiMode === "preview") return <PreviewPanel />

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 border-b">
        <BrowseTab
          active={wikiMode === "graph"}
          onClick={() => setWikiBrowseMode("graph")}
          icon={<Network className="h-3.5 w-3.5" />}
          label={t("nav.graph")}
        />
        <BrowseTab
          active={wikiMode === "search"}
          onClick={() => setWikiBrowseMode("search")}
          icon={<Search className="h-3.5 w-3.5" />}
          label={t("nav.search")}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {wikiMode === "search" ? <SearchView /> : <GraphView />}
      </div>
    </div>
  )
}

function BrowseTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? "border-b-2 border-primary text-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
