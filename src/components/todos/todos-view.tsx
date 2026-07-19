import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ClipboardList, ClipboardCheck } from "lucide-react"
import { ReviewView } from "@/components/review/review-view"
import { LintView } from "@/components/lint/lint-view"
import { useReviewPendingCount, useLintPendingCount } from "@/lib/todos"

type TodoTab = "review" | "lint"

/**
 * Unified task surface. Review and Lint are both "things I need to
 * handle", so they live behind one entry as two tabs. Each tab renders
 * the original view unchanged — all resolve / fix / batch / refresh
 * behaviour is preserved by delegation, nothing is reimplemented here.
 */
export function TodosView() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<TodoTab>("review")
  const reviewCount = useReviewPendingCount()
  const lintCount = useLintPendingCount()

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b px-2 py-1.5">
        <TabButton
          active={tab === "review"}
          onClick={() => setTab("review")}
          icon={ClipboardList}
          label={t("todos.tabReview")}
          count={reviewCount}
        />
        <TabButton
          active={tab === "lint"}
          onClick={() => setTab("lint")}
          icon={ClipboardCheck}
          label={t("todos.tabLint")}
          count={lintCount}
        />
      </div>
      <div className="min-h-0 flex-1">
        <div className={tab === "review" ? "h-full" : "hidden"}>
          <ReviewView />
        </div>
        <div className={tab === "lint" ? "h-full" : "hidden"}>
          <LintView />
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: typeof ClipboardList
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {count > 0 && (
        <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  )
}
