import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { invoke } from "@tauri-apps/api/core"
import { Plus, RefreshCw, Search, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useChatStore } from "@/stores/chat-store"
import { useWikiStore } from "@/stores/wiki-store"
import { saveChatPreferences } from "@/lib/persist"

interface AvailableAgentSkill {
  id: string
  name: string
  description?: string
  source: string
}

function sourceLabel(source: string, t: ReturnType<typeof useTranslation>["t"]) {
  return t(`chat.skillSources.${source}`, { defaultValue: source })
}

/**
 * Derive a portable skill id (file stem) from a display name. Replaces
 * whitespace, path separators, and Windows-illegal characters with hyphens
 * so the result is always a valid file name accepted by the backend's
 * normalize_skill_name check. Preserves unicode (e.g. CJK) and keeps `.`,
 * `-`, `_` for readability.
 */
function slugifySkillId(name: string): string {
  const slug = name
    .trim()
    .replace(/[\s/\\<>:"|?*]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "skill"
}

export function SkillsSection() {
  const { t } = useTranslation()
  const project = useWikiStore((s) => s.project)
  const useWebSearch = useChatStore((s) => s.useWebSearch)
  const useAnyTxtSearch = useChatStore((s) => s.useAnyTxtSearch)
  const agentMode = useChatStore((s) => s.agentMode)
  const retrievalMode = useChatStore((s) => s.retrievalMode)
  const selectedSkills = useChatStore((s) => s.selectedSkills)
  const disabledSkills = useChatStore((s) => s.disabledSkills)
  const setSelectedSkills = useChatStore((s) => s.setSelectedSkills)
  const setDisabledSkills = useChatStore((s) => s.setDisabledSkills)

  const [skills, setSkills] = useState<AvailableAgentSkill[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const disabled = useMemo(() => new Set(disabledSkills), [disabledSkills])
  const enabledCount = skills.filter((skill) => !disabled.has(skill.id)).length
  const filteredSkills = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return skills
    return skills.filter((skill) => {
      const fields = [
        skill.name,
        skill.id,
        skill.description ?? "",
        sourceLabel(skill.source, t),
        skill.source,
      ]
      return fields.some((field) => field.toLowerCase().includes(query))
    })
  }, [searchQuery, skills, t])

  const persist = useCallback(async (nextSelected: string[], nextDisabled: string[]) => {
    if (!project?.path) return
    await saveChatPreferences(project.path, {
      useWebSearch,
      useAnyTxtSearch,
      agentMode,
      retrievalMode,
      selectedSkills: nextSelected,
      disabledSkills: nextDisabled,
    })
  }, [agentMode, project?.path, retrievalMode, useAnyTxtSearch, useWebSearch])

  const scan = useCallback(async () => {
    if (!project?.path) {
      setSkills([])
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const found = await invoke<AvailableAgentSkill[]>("agent_list_skills", {
        projectPath: project.path,
      })
      setSkills(found)
      const foundIds = new Set(found.map((skill) => skill.id))
      const currentSelected = useChatStore.getState().selectedSkills
      const currentDisabled = useChatStore.getState().disabledSkills
      const currentDisabledSet = new Set(currentDisabled)
      const nextSelected = currentSelected.filter((id) => foundIds.has(id) && !currentDisabledSet.has(id))
      // Keep disabled ids even when a root is temporarily unavailable or a skill
      // folder is not currently mounted. Otherwise a deliberately disabled skill
      // would come back enabled after the next successful scan.
      const nextDisabled = currentDisabled
      if (nextSelected.length !== currentSelected.length) {
        setSelectedSkills(nextSelected)
        await persist(nextSelected, nextDisabled)
      }
      setStatus(t("settings.sections.skills.scanDone", {
        defaultValue: "Found {{count}} skills.",
        count: found.length,
      }))
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [persist, project?.path, setSelectedSkills, t])

  useEffect(() => {
    void scan()
  }, [scan])

  const setSkillEnabled = useCallback(async (id: string, enabled: boolean) => {
    const nextDisabled = enabled
      ? disabledSkills.filter((item) => item !== id)
      : Array.from(new Set([...disabledSkills, id]))
    const nextSelected = enabled
      ? selectedSkills
      : selectedSkills.filter((item) => item !== id)
    setDisabledSkills(nextDisabled)
    if (nextSelected.length !== selectedSkills.length) setSelectedSkills(nextSelected)
    await persist(nextSelected, nextDisabled)
  }, [disabledSkills, persist, selectedSkills, setDisabledSkills, setSelectedSkills])

  const setAllEnabled = useCallback(async (enabled: boolean) => {
    const allIds = skills.map((skill) => skill.id)
    const all = new Set(allIds)
    const nextDisabled = enabled ? [] : allIds
    const nextSelected = enabled ? selectedSkills : selectedSkills.filter((id) => !all.has(id))
    setDisabledSkills(nextDisabled)
    if (nextSelected.length !== selectedSkills.length) setSelectedSkills(nextSelected)
    await persist(nextSelected, nextDisabled)
  }, [persist, selectedSkills, setDisabledSkills, setSelectedSkills, skills])

  // --- Create skill ---
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", instructions: "" })
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const slug = useMemo(() => slugifySkillId(form.name), [form.name])

  const openCreate = useCallback(() => {
    setForm({ name: "", description: "", instructions: "" })
    setCreateError(null)
    setCreateOpen(true)
  }, [])

  const handleCreate = useCallback(async () => {
    if (!project?.path) return
    setCreating(true)
    setCreateError(null)
    try {
      await invoke("agent_create_skill", {
        projectPath: project.path,
        id: slug,
        name: form.name,
        description: form.description,
        instructions: form.instructions,
      })
      setCreateOpen(false)
      await scan()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err))
    } finally {
      setCreating(false)
    }
  }, [form, project?.path, scan, slug])

  // --- Delete skill (two-stage: click arms, click again confirms) ---
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  useEffect(() => {
    if (!pendingDeleteId) return
    const timer = setTimeout(() => setPendingDeleteId(null), 5000)
    return () => clearTimeout(timer)
  }, [pendingDeleteId])

  const handleDelete = useCallback(
    async (id: string) => {
      if (!project?.path) return
      try {
        await invoke("agent_delete_skill", { projectPath: project.path, id })
        // Drop the removed id from persisted selections so it doesn't linger.
        const curSelected = useChatStore.getState().selectedSkills
        const curDisabled = useChatStore.getState().disabledSkills
        const nextSelected = curSelected.filter((item) => item !== id)
        const nextDisabled = curDisabled.filter((item) => item !== id)
        if (nextSelected.length !== curSelected.length) setSelectedSkills(nextSelected)
        if (nextDisabled.length !== curDisabled.length) setDisabledSkills(nextDisabled)
        await persist(nextSelected, nextDisabled)
        setPendingDeleteId(null)
        await scan()
      } catch (err) {
        setStatus(err instanceof Error ? err.message : String(err))
        setPendingDeleteId(null)
      }
    },
    [persist, project?.path, scan, setDisabledSkills, setSelectedSkills],
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">
          {t("settings.sections.skills.title", { defaultValue: "Skills" })}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("settings.sections.skills.description", {
            defaultValue:
              "Scan project and user skill folders, then choose which skills can be used from Chat.",
          })}
        </p>
      </div>

      <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
        {t("settings.sections.skills.paths", {
          defaultValue:
            "Scanned folders: .llm-wiki/skills, ~/.claude/skills, ~/.codex/skills, ~/.agents/skills.",
        })}
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("settings.sections.skills.searchPlaceholder", {
              defaultValue: "Search skills by name, id, description, or source...",
            })}
            className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            {t("settings.sections.skills.summary", {
              defaultValue: "{{enabled}} enabled / {{total}} discovered",
              enabled: enabledCount,
              total: skills.length,
            })}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="default" size="sm" onClick={openCreate} disabled={!project}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {t("settings.sections.skills.newSkill")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void setAllEnabled(true)} disabled={skills.length === 0}>
              {t("settings.sections.skills.enableAll", { defaultValue: "Enable all" })}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void setAllEnabled(false)} disabled={skills.length === 0}>
              {t("settings.sections.skills.disableAll", { defaultValue: "Disable all" })}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void scan()} disabled={loading || !project}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {t("settings.sections.skills.refresh", { defaultValue: "Rescan" })}
            </Button>
          </div>
        </div>
      </div>

      {status && <p className="text-xs text-muted-foreground">{status}</p>}

      {skills.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          <Sparkles className="mx-auto mb-2 h-5 w-5 opacity-50" />
          {t("settings.sections.skills.empty", {
            defaultValue: "No skills found. Add SKILL.md files to a scanned folder, then rescan.",
          })}
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          <Search className="mx-auto mb-2 h-5 w-5 opacity-50" />
          {t("settings.sections.skills.noSearchResults", {
            defaultValue: "No skills match this search.",
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSkills.map((skill) => {
            const active = !disabled.has(skill.id)
            return (
              <div
                key={skill.id}
                className={`rounded-md border p-3 transition-colors ${
                  active ? "bg-background" : "bg-muted/30 opacity-75"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{skill.name}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {sourceLabel(skill.source, t)}
                      </span>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {skill.id}
                      </code>
                    </div>
                    {skill.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{skill.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={(event) => void setSkillEnabled(skill.id, event.target.checked)}
                        className="h-4 w-4"
                      />
                      {active
                        ? t("settings.sections.skills.enabled", { defaultValue: "Enabled" })
                        : t("settings.sections.skills.disabled", { defaultValue: "Disabled" })}
                    </label>
                    {pendingDeleteId === skill.id ? (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleDelete(skill.id)}
                        className="h-7 px-2 text-xs"
                      >
                        {t("settings.sections.skills.deleteConfirm", { defaultValue: "Confirm delete" })}
                      </Button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(skill.id)}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title={t("settings.sections.skills.deleteTooltip", { defaultValue: "Delete this skill" })}
                        aria-label={t("settings.sections.skills.deleteTooltip", { defaultValue: "Delete this skill" })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("settings.sections.skills.createTitle")}</DialogTitle>
            <DialogDescription>{t("settings.sections.skills.createDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">{t("settings.sections.skills.nameLabel")}</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t("settings.sections.skills.nameLabel", { defaultValue: "Name" })}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-primary"
              />
              <p className="text-[11px] text-muted-foreground">
                {t("settings.sections.skills.nameHint")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("settings.sections.skills.idHint", { slug })}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">{t("settings.sections.skills.descriptionLabel")}</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t("settings.sections.skills.descriptionPlaceholder")}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">{t("settings.sections.skills.instructionsLabel")}</label>
              <textarea
                value={form.instructions}
                onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                placeholder={t("settings.sections.skills.instructionsPlaceholder")}
                rows={6}
                className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            {createError && <p className="text-xs text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)} disabled={creating}>
              {t("settings.sections.skills.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={() => void handleCreate()}
              disabled={creating || !form.description.trim() || !form.instructions.trim()}
            >
              {t("settings.sections.skills.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
