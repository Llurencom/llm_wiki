import { describe, expect, it } from "vitest"
import { countPendingReview, countPendingLint, combineTodoTotal } from "./todos"
import type { ReviewItem } from "@/stores/review-store"
import type { LintItem } from "@/stores/lint-store"

function makeReviewItem(id: string, resolved: boolean): ReviewItem {
  return {
    id,
    type: "confirm",
    title: `${id} title`,
    description: "",
    options: [],
    resolved,
    createdAt: Date.now(),
  }
}

function makeLintItem(id: string): LintItem {
  return {
    id,
    type: "orphan",
    severity: "info",
    page: `${id}.md`,
    detail: "",
    createdAt: Date.now(),
  }
}

describe("countPendingReview", () => {
  it("counts only unresolved review items", () => {
    const items = [
      makeReviewItem("a", false),
      makeReviewItem("b", true),
      makeReviewItem("c", false),
    ]
    expect(countPendingReview(items)).toBe(2)
  })

  it("returns 0 for an empty queue", () => {
    expect(countPendingReview([])).toBe(0)
  })
})

describe("countPendingLint", () => {
  it("counts every lint item", () => {
    expect(countPendingLint([makeLintItem("a"), makeLintItem("b")])).toBe(2)
  })
})

describe("combineTodoTotal", () => {
  it("sums the two pending sources", () => {
    expect(combineTodoTotal(2, 3)).toBe(5)
  })

  it("is zero when both are empty", () => {
    expect(combineTodoTotal(0, 0)).toBe(0)
  })
})
