import { useState, useEffect, useRef } from "react"
import {
  FileText, FolderOpen, Settings, ArrowLeftRight, ListTodo, MessageSquare, BookOpen, Upload, FileUp, FolderUp,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useWikiStore } from "@/stores/wiki-store"
import { useTodoTotalPending } from "@/lib/todos"
import { useUpdateStore, shouldShowUpdateBanner } from "@/stores/update-store"
import { useTranslation } from "react-i18next"
import { pickAndImportFiles, pickAndImportFolder } from "@/lib/source-import-actions"
import logoImg from "@/assets/logo.jpg"
import type { WikiState } from "@/stores/wiki-store"

type NavView = WikiState["activeView"]

// Core layer — always present because any moment may need them.
// 知识库 is the user's accumulated "knowledge avatar" and sits beside
// 对话 (Chat) as the two first-class surfaces; both core-business
// (accumulate via chat / use via chat) and the knowledge base itself
// are one click away.
const CORE_ITEMS: { view: NavView; icon: typeof FileText; labelKey: string }[] = [
  { view: "chat", icon: MessageSquare, labelKey: "nav.chat" },
  { view: "wiki", icon: BookOpen, labelKey: "nav.wiki" },
]

interface IconSidebarProps {
  onSwitchProject: () => void
}

export function IconSidebar({ onSwitchProject }: IconSidebarProps) {
  const { t } = useTranslation()
  const activeView = useWikiStore((s) => s.activeView)
  const setActiveView = useWikiStore((s) => s.setActiveView)
  const todoCount = useTodoTotalPending()
  // Update dot respects the dismiss preference: it clears once the user
  // acknowledges the update (opens the download page / clicks "later") and
  // reappears when a newer version ships.
  const updateAvailable = useUpdateStore((s) => shouldShowUpdateBanner(s))

  // Daemon health check
  const [daemonStatus, setDaemonStatus] = useState<string>("starting")
  useEffect(() => {
    const check = async () => {
      try {
        const { clipServerStatus } = await import("@/commands/fs")
        const status = await clipServerStatus()
        setDaemonStatus(status)
      } catch {
        setDaemonStatus("error")
      }
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

  // "文件导入" gateway — sits directly below 知识库 in the sidebar. It is an
  // ACTION, not a view: clicking it opens a small menu to pick import type,
  // then reuses the SAME import code path as the Sources view
  // (pickAndImportFiles/Folder → importSourceFiles/Folder). After a successful
  // import we land on the Sources (文件) view so the user sees the new files.
  // Data import is core business — this stays a thin wrapper, never a
  // reimplementation.
  const project = useWikiStore((s) => s.project)
  const llmConfig = useWikiStore((s) => s.llmConfig)
  const sourceWatchConfig = useWikiStore((s) => s.sourceWatchConfig)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const importRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!importOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (importRef.current && !importRef.current.contains(event.target as Node)) {
        setImportOpen(false)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [importOpen])

  const runImport = async (kind: "files" | "folder") => {
    if (!project) return
    setImporting(true)
    try {
      const ok =
        kind === "files"
          ? await pickAndImportFiles(project, llmConfig, sourceWatchConfig, t("sources.importSourceFiles"))
          : await pickAndImportFolder(project, llmConfig, sourceWatchConfig, t("sources.importSourceFolder"))
      if (ok) {
        useWikiStore.getState().bumpDataVersion()
        setActiveView("sources")
      }
    } catch (err) {
      console.error(`[sidebar] failed to import ${kind}:`, err)
    } finally {
      setImporting(false)
      setImportOpen(false)
    }
  }

  return (
    <TooltipProvider delay={300}>
      <div className="flex h-full w-12 flex-col items-center border-r bg-muted/50 py-2">
        {/* Logo */}
        <div className="mb-2 flex items-center justify-center">
          <img
            src={logoImg}
            alt="Lluren Wiki"
            className="h-8 w-8 rounded-[22%]"
          />
        </div>
        {/* Top: core nav items + More */}
        <div className="flex flex-1 flex-col items-center gap-1">
          {CORE_ITEMS.map(({ view, icon: Icon, labelKey }) => (
            <Tooltip key={view}>
              <TooltipTrigger
                onClick={() => setActiveView(view)}
                className={`relative flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                  activeView === view
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
              </TooltipTrigger>
              <TooltipContent side="right">{t(labelKey)}</TooltipContent>
            </Tooltip>
          ))}
          {/* 文件导入 — an action entry directly below 知识库. Opens a menu to
              pick import type; on success it leaves for the Sources (文件)
              view, so it is intentionally not a navigation view. */}
          <div ref={importRef} className="relative">
            <Tooltip>
              <TooltipTrigger
                onClick={() => setImportOpen((open) => !open)}
                disabled={!project || importing}
                className={`relative flex h-10 w-10 items-center justify-center rounded-md transition-colors disabled:opacity-50 ${
                  importOpen
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                }`}
              >
                <Upload className="h-5 w-5" />
                {importing && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                )}
              </TooltipTrigger>
              <TooltipContent side="right">{t("nav.importFiles")}</TooltipContent>
            </Tooltip>
            {importOpen && (
              <div className="absolute left-11 top-0 z-30 w-44 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">
                <button
                  type="button"
                  onClick={() => void runImport("files")}
                  disabled={importing || !project}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent/60 disabled:opacity-50"
                >
                  <FileUp className="h-4 w-4 shrink-0" />
                  {t("sources.importSourceFiles")}
                </button>
                <button
                  type="button"
                  onClick={() => void runImport("folder")}
                  disabled={importing || !project}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent/60 disabled:opacity-50"
                >
                  <FolderUp className="h-4 w-4 shrink-0" />
                  {t("sources.importSourceFolder")}
                </button>
                {/* 分隔线：导入操作 与 已有资料（历史文件）分开 */}
                <div className="my-1 h-px bg-border" />
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("sources")
                    setImportOpen(false)
                  }}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                    activeView === "sources" ? "bg-accent text-foreground" : "hover:bg-accent/60"
                  }`}
                >
                  <FolderOpen className="h-4 w-4 shrink-0" />
                  {t("nav.historicalFiles")}
                </button>
              </div>
            )}
          </div>
        </div>
        {/* Bottom: todos (only when pending) + daemon status + settings + switch project */}
        <div className="flex flex-col items-center gap-1 pb-1">
          {/* Tasks entry — zero-state, zero-UI: appears only when there is
              something to handle, and disappears when the queue is empty. */}
          {todoCount > 0 && (
            <Tooltip>
              <TooltipTrigger
                onClick={() => setActiveView("todos")}
                className={`relative flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                  activeView === "todos"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                }`}
              >
                <ListTodo className="h-5 w-5" />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {todoCount > 99 ? "99+" : todoCount}
                </span>
              </TooltipTrigger>
              <TooltipContent side="right">{`${t("nav.todos")} (${todoCount})`}</TooltipContent>
            </Tooltip>
          )}
          {/* Daemon status indicator */}
          <Tooltip>
            <TooltipTrigger className="flex h-6 w-6 items-center justify-center">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  daemonStatus === "running" ? "bg-emerald-500" :
                  daemonStatus === "starting" ? "bg-amber-400 animate-pulse" :
                  daemonStatus === "port_conflict" ? "bg-red-500" :
                  "bg-red-500 animate-pulse"
                }`}
              />
            </TooltipTrigger>
            <TooltipContent side="right">
              {daemonStatus === "running" && "Clip server running"}
              {daemonStatus === "starting" && "Clip server starting..."}
              {daemonStatus === "port_conflict" && "Port 19827 is occupied. Web Clipper unavailable."}
              {daemonStatus === "error" && "Clip server error. Restarting..."}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              onClick={() => setActiveView("settings")}
              className={`relative flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                activeView === "settings"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              }`}
            >
              <Settings className="h-5 w-5" />
              {updateAvailable && (
                // Update-available indicator on the Settings gear.
                // Smaller (8px / `h-2 w-2`) so it doesn't shout —
                // the top banner is already the loud surface; this
                // dot is just a quiet "where to go" signpost. Red
                // (vs. previous primary-blue) gives it enough
                // visual contrast that it's still noticeable
                // against the gear icon despite the small size.
                // Dismissed versions clear it automatically via
                // shouldShowUpdateBanner.
                <span
                  className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-muted/50"
                  title={t("nav.updateAvailable")}
                />
              )}
            </TooltipTrigger>
            <TooltipContent side="right">
              {t("nav.settings")}
              {updateAvailable ? t("nav.updateAvailableSuffix") : ""}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              onClick={onSwitchProject}
              className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-accent-foreground"
            >
              <ArrowLeftRight className="h-5 w-5" />
            </TooltipTrigger>
            <TooltipContent side="right">{t("nav.switchProject")}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
