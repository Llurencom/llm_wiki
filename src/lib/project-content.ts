import { useWikiStore } from "@/stores/wiki-store"
import type { ProjectPathIndex } from "@/lib/wiki-page-resolver"

/** Pure predicate: does the index hold any file? Testable without a store. */
export function projectIndexHasContent(index: ProjectPathIndex): boolean {
  return index.byPath.size > 0
}

/**
 * True once the open project has at least one indexed file (a source
 * or a generated wiki page). Drives state-based zero-state UI: an empty
 * project shouldn't greet the user with a generic "start chatting"
 * prompt — it should point them at importing material first. As soon as
 * anything is indexed the guidance retracts on its own.
 */
export function useProjectHasContent(): boolean {
  return useWikiStore((s) => projectIndexHasContent(s.projectPathIndex))
}
