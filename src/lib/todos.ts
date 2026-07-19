import { useReviewStore } from "@/stores/review-store"
import { useLintStore } from "@/stores/lint-store"
import type { ReviewItem } from "@/stores/review-store"
import type { LintItem } from "@/stores/lint-store"

/** Pure count of unresolved review items — testable without a store. */
export function countPendingReview(items: readonly ReviewItem[]): number {
  return items.filter((i) => !i.resolved).length
}

/** Pure count of lint items — testable without a store. */
export function countPendingLint(items: readonly LintItem[]): number {
  return items.length
}

/** Combined pending total across both task-like sources. */
export function combineTodoTotal(reviewPending: number, lintPending: number): number {
  return reviewPending + lintPending
}

/**
 * Read-only aggregation over the two task-like stores (review + lint).
 * Neither store is mutated here — the unified "Tasks" surface renders
 * the existing ReviewView / LintView and their own resolve/fix logic,
 * so this only feeds counts for the badge, the "no tasks → no entry"
 * visibility rule, and the in-chat new-task nudge.
 */
export function useReviewPendingCount(): number {
  return useReviewStore((s) => countPendingReview(s.items))
}

export function useLintPendingCount(): number {
  return useLintStore((s) => countPendingLint(s.items))
}

export function useTodoTotalPending(): number {
  const review = useReviewPendingCount()
  const lint = useLintPendingCount()
  return combineTodoTotal(review, lint)
}
