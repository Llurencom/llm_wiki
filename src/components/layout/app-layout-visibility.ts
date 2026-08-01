import type { WikiState } from "@/stores/wiki-store"

export function isStandaloneView(view: WikiState["activeView"]): boolean {
  return view === "chat" || view === "skills" || view === "settings"
}

export function getAppLayoutVisibility(
  activeView: WikiState["activeView"],
): { showLeftPanel: boolean } {
  return {
    showLeftPanel: !isStandaloneView(activeView),
  }
}
