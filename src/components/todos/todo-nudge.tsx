import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { ListTodo, X } from "lucide-react"
import { useWikiStore } from "@/stores/wiki-store"
import { useTodoTotalPending } from "@/lib/todos"

/**
 * In-context, non-blocking notice: when new tasks appear WHILE the user
 * is in the chat, surface a quiet line ("N new tasks — view / later")
 * right where they already are, instead of making them discover it in
 * another tab. Dismissible and deferrable; it never interrupts. When the
 * queue drops back to zero the notice disappears on its own (zero-state,
 * zero-UI).
 */
export function TodoNudge() {
  const { t } = useTranslation()
  const total = useTodoTotalPending()
  const setActiveView = useWikiStore((s) => s.setActiveView)
  const prevTotal = useRef(total)
  const [delta, setDelta] = useState(0)

  useEffect(() => {
    if (total > prevTotal.current) {
      setDelta((d) => d + (total - prevTotal.current))
    }
    if (total === 0) {
      setDelta(0)
    }
    prevTotal.current = total
  }, [total])

  if (delta <= 0 || total <= 0) return null

  return (
    <div className="mx-3 mb-1 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs">
      <ListTodo className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="flex-1 text-foreground">
        {t("todos.newTasks", { count: delta })}
      </span>
      <button
        type="button"
        onClick={() => {
          setDelta(0)
          setActiveView("todos")
        }}
        className="rounded px-2 py-0.5 font-medium text-primary hover:bg-primary/10"
      >
        {t("todos.view")}
      </button>
      <button
        type="button"
        onClick={() => setDelta(0)}
        className="rounded p-0.5 text-muted-foreground hover:bg-muted"
        title={t("todos.dismiss")}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
