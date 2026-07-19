import { describe, expect, it } from "vitest"
import { projectIndexHasContent } from "./project-content"
import {
  createEmptyProjectPathIndex,
  buildProjectPathIndexFromTree,
} from "./wiki-page-resolver"

describe("projectIndexHasContent", () => {
  it("is false for a freshly opened empty project", () => {
    expect(projectIndexHasContent(createEmptyProjectPathIndex())).toBe(false)
  })

  it("is true once the project has at least one indexed file", () => {
    const index = buildProjectPathIndexFromTree([
      { name: "note.md", path: "wiki/note.md", is_dir: false },
    ])
    expect(projectIndexHasContent(index)).toBe(true)
  })
})
