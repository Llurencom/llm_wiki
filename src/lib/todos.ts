import { useReviewStore } from "@/stores/review-store"
import { useLintStore } from "@/stores/lint-store"

/**
 * Read-only aggregation over the two task-like stores (review + lint).
 * Neither store is mutated here — the unified "Tasks" surface renders
 * the existing ReviewView / LintView and their own resolve/fix logic,
 * so this only feeds counts for the badge, the "no tasks → no entry"
 * visibility rule, and the in-chat new-task nudge.
 */
export function useReviewPendingCount(): number {
  return useReviewStore((s) => s.items.filter((i) => !i.resolved).length)
}

export function useLintPendingCount(): number {
  return useLintStore((s) => s.items.length)
}

export function useTodoTotalPending(): number {
  const review = useReviewPendingCount()
  const lint = useLintPendingCount()
  return review + lint
}
