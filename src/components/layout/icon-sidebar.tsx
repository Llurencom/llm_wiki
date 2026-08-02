import { useState, useEffect, useRef } from "react"
import {
  FileText, FolderOpen, Settings, ArrowLeftRight, ListTodo, MessageSquare, MoreHorizontal, ShieldCheck, BookOpen,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useWikiStore } from "@/stores/wiki-store"
import { useTodoTotalPending } from "@/lib/todos"
import { useUpdateStore, hasAvailableUpdate } from "@/stores/update-store"
import { useTranslation } from "react-i18next"
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

// Secondary layer — reachable on demand from the "More" menu. Search and
// Graph are parallel tabs inside the Knowledge (wiki) view; Skills now lives
// under Settings, so the More menu only keeps 文件 (import/raw sources).
const MORE_ITEMS: { view: NavView; icon: typeof FileText; labelKey: string }[] = [
  { view: "sources", icon: FolderOpen, labelKey: "nav.sources" },
]

interface IconSidebarProps {
  onSwitchProject: () => void
}

export function IconSidebar({ onSwitchProject }: IconSidebarProps) {
  const { t } = useTranslation()
  const activeView = useWikiStore((s) => s.activeView)
  const setActiveView = useWikiStore((s) => s.setActiveView)
  const setTodosInitialTab = useWikiStore((s) => s.setTodosInitialTab)
  const todoCount = useTodoTotalPending()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  // Use `hasAvailableUpdate` (ignores dismiss state) rather than
  // `shouldShowUpdateBanner`. The dot is a passive signpost — it
  // should keep marking the gear as long as the update exists, even
  // after the user closes the more aggressive top banner. Without
  // this split, dismissing the banner would silently lose the only
  // remaining indicator that an update is available, so the user
  // never finds their way back to it.
  const updateAvailable = useUpdateStore((s) => hasAvailableUpdate(s))

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

  useEffect(() => {
    if (!moreOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [moreOpen])

  // A More-menu view counts as active so the More button stays highlighted.
  const moreActive = MORE_ITEMS.some((item) => item.view === activeView)

  return (
    <TooltipProvider delay={300}>
      <div className="flex h-full w-12 flex-col items-center border-r bg-muted/50 py-2">
        {/* Logo */}
        <div className="mb-2 flex items-center justify-center">
          <img
            src={logoImg}
            alt="LLM Wiki"
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
          {/* More — secondary views appear on demand, not always spread out */}
          <div ref={moreRef} className="relative">
            <Tooltip>
              <TooltipTrigger
                onClick={() => setMoreOpen((open) => !open)}
                className={`relative flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                  moreActive || moreOpen
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                }`}
              >
                <MoreHorizontal className="h-5 w-5" />
              </TooltipTrigger>
              <TooltipContent side="right">{t("nav.more")}</TooltipContent>
            </Tooltip>
            {moreOpen && (
              <div className="absolute left-11 top-0 z-30 w-40 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">
                {MORE_ITEMS.map(({ view, icon: Icon, labelKey }) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => {
                      setActiveView(view)
                      setMoreOpen(false)
                    }}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                      activeView === view ? "bg-accent text-foreground" : "hover:bg-accent/60"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {t(labelKey)}
                  </button>
                ))}
                {/* Scan quality — an intentional action, not a resting view.
                    The Tasks entry only appears once issues exist, so this
                    keeps the quality scan reachable on a clean project. It
                    opens the Tasks surface straight on the lint tab. */}
                <button
                  type="button"
                  onClick={() => {
                    setTodosInitialTab("lint")
                    setActiveView("todos")
                    setMoreOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent/60"
                >
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  {t("nav.scanQuality")}
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
