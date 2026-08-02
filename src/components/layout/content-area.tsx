import { useEffect, useRef, useState } from "react"
import { Network, Search, Upload, FileUp, FolderUp } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useWikiStore } from "@/stores/wiki-store"
import { pickAndImportFiles, pickAndImportFolder } from "@/lib/source-import-actions"
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
  const project = useWikiStore((s) => s.project)
  const llmConfig = useWikiStore((s) => s.llmConfig)
  const sourceWatchConfig = useWikiStore((s) => s.sourceWatchConfig)
  const setActiveView = useWikiStore((s) => s.setActiveView)

  // "文件导入" gateway: opens a small menu to pick import type, then reuses
  // the SAME import code path as the Sources view (pickAndImportFiles /
  // pickAndImportFolder → importSourceFiles / importSourceFolder). After a
  // successful import we land on the Sources (文件) view so the user sees the
  // freshly imported files. Data import is core business, so this must stay
  // a thin wrapper over the existing import pipeline — never a reimplementation.
  const [importMenuOpen, setImportMenuOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const importRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!importMenuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (importRef.current && !importRef.current.contains(event.target as Node)) {
        setImportMenuOpen(false)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [importMenuOpen])

  const runImport = async (kind: "files" | "folder") => {
    if (!project) return
    setImporting(true)
    try {
      const ok =
        kind === "files"
          ? await pickAndImportFiles(project, llmConfig, sourceWatchConfig, t("sources.importSourceFiles"))
          : await pickAndImportFolder(project, llmConfig, sourceWatchConfig, t("sources.importSourceFolder"))
      if (ok) {
        // Bump so the Sources view (mounts next) and other surfaces refresh.
        useWikiStore.getState().bumpDataVersion()
        setActiveView("sources")
      }
    } catch (err) {
      console.error(`[knowledge] failed to import ${kind}:`, err)
    } finally {
      setImporting(false)
      setImportMenuOpen(false)
    }
  }

  if (wikiMode === "preview") return <PreviewPanel />

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-stretch border-b">
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
        {/* 文件导入 — an action entry, not a browse surface. Opens a menu to
            pick import type; on success it leaves the Knowledge view for the
            Sources (文件) view, so it is intentionally not a wikiMode tab. */}
        <div ref={importRef} className="relative ml-auto flex">
          <button
            type="button"
            onClick={() => setImportMenuOpen((open) => !open)}
            disabled={!project || importing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            title={t("nav.importFilesHint")}
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("nav.importFiles")}</span>
            {importing && <span className="ml-0.5 animate-pulse">…</span>}
          </button>
          {importMenuOpen && (
            <div className="absolute right-0 top-full z-30 mt-px w-48 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">
              <button
                type="button"
                onClick={() => void runImport("files")}
                disabled={importing || !project}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent disabled:opacity-50"
              >
                <FileUp className="h-3.5 w-3.5 shrink-0" />
                {t("sources.importSourceFiles")}
              </button>
              <button
                type="button"
                onClick={() => void runImport("folder")}
                disabled={importing || !project}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent disabled:opacity-50"
              >
                <FolderUp className="h-3.5 w-3.5 shrink-0" />
                {t("sources.importSourceFolder")}
              </button>
            </div>
          )}
        </div>
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
