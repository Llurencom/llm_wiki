import { useEffect, useCallback, useRef } from "react"
import { X, ArrowLeft, Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useWikiStore } from "@/stores/wiki-store"
import { readFile, writeFile } from "@/commands/fs"
import { getFileCategory, isBinary, isExtractedTextPreviewFile } from "@/lib/file-types"
import { WikiEditor } from "@/components/editor/wiki-editor"
import { FilePreview } from "@/components/editor/file-preview"
import { getFileName } from "@/lib/path-utils"

export function PreviewPanel() {
  const selectedFile = useWikiStore((s) => s.selectedFile)
  const fileContent = useWikiStore((s) => s.fileContent)
  const previewContentPath = useWikiStore((s) => s.previewContentPath)
  const externalPreview = useWikiStore((s) => s.externalPreview)
  const setFileContent = useWikiStore((s) => s.setFileContent)
  const closePreview = useWikiStore((s) => s.closePreview)
  const previewReturnView = useWikiStore((s) => s.previewReturnView)
  const { t } = useTranslation()
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Snapshot of what was most recently loaded from disk. Milkdown re-emits
  // `markdownUpdated` on initial parse (before the user types anything),
  // which used to trigger an auto-save that could write back a placeholder
  // marker if read_file had returned one for a missing/locked file. We
  // skip save when the incoming markdown equals the last-loaded content.
  const lastLoadedRef = useRef<string>("")

  useEffect(() => {
    if (!selectedFile) {
      setFileContent("")
      lastLoadedRef.current = ""
      return
    }
    if (previewContentPath === selectedFile) {
      lastLoadedRef.current = fileContent
      return
    }
    if (externalPreview?.path === selectedFile) {
      lastLoadedRef.current = fileContent
      return
    }

    const category = getFileCategory(selectedFile)

    if (isBinary(category) && !isExtractedTextPreviewFile(selectedFile)) {
      setFileContent("")
      lastLoadedRef.current = ""
      return
    }

    readFile(selectedFile)
      .then((content) => {
        lastLoadedRef.current = content
        setFileContent(content)
      })
      .catch((err) => {
        lastLoadedRef.current = ""
        setFileContent(`Error loading file: ${err}`)
      })
  }, [selectedFile, previewContentPath, externalPreview, setFileContent])

  const writeNow = useCallback((path: string, markdown: string, syncStore = false) => {
    writeFile(path, markdown)
      .then(() => {
        lastLoadedRef.current = markdown
        if (syncStore) setFileContent(markdown)
      })
      .catch((err) => console.error("Failed to save:", err))
  }, [setFileContent])

  const handleSave = useCallback(
    (markdown: string, options?: { immediate?: boolean }) => {
      if (!selectedFile) return
      // Ignore no-op saves from the editor's initial re-emit. Only write
      // when the user has actually changed the content relative to the
      // last disk read.
      if (markdown === lastLoadedRef.current) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (options?.immediate) {
        setFileContent(markdown)
        writeNow(selectedFile, markdown, true)
        return
      }
      saveTimerRef.current = setTimeout(() => {
        writeNow(selectedFile, markdown, true)
      }, 1000)
    },
    [selectedFile, setFileContent, writeNow]
  )

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const category = selectedFile ? getFileCategory(selectedFile) : "other"
  const fileName = selectedFile
    ? externalPreview?.path === selectedFile
      ? externalPreview.title
      : getFileName(selectedFile)
    : ""

  const openSearch = () => useWikiStore.getState().setActiveView("search")

  const backLabel = previewReturnView
    ? t("preview.backTo", { source: t(`nav.${previewReturnView}`) })
    : ""

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-1.5">
        {previewReturnView ? (
          // Semantic return, made prominent. The user arrived here from a
          // task / search action and the full-width preview replaced the
          // list they came from, so the way back must be the first thing
          // they see: a bordered button on the LEFT (where "back" is
          // expected), not a faint link tucked in the corner.
          <>
            <button
              onClick={closePreview}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
              title={backLabel}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {backLabel}
            </button>
            <span
              className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
              title={selectedFile ?? ""}
            >
              {fileName}
            </span>
            <button
              type="button"
              onClick={openSearch}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={t("preview.searchPagesHint")}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("preview.searchPages")}</span>
            </button>
          </>
        ) : (
          <>
            <span
              className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
              title={selectedFile ?? ""}
            >
              {fileName || t("preview.selectFile")}
            </span>
            <button
              type="button"
              onClick={openSearch}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={t("preview.searchPagesHint")}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("preview.searchPages")}</span>
            </button>
            {selectedFile && (
              <button
                onClick={closePreview}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent"
                title={t("common.close")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
      </div>
      <div className="flex-1 min-w-0 overflow-auto">
        {!selectedFile ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t("preview.selectFile")}
          </div>
        ) : externalPreview?.path === selectedFile ? (
          <ExternalReferencePreview
            source={externalPreview.source}
            title={externalPreview.title}
            path={externalPreview.url}
            snippet={externalPreview.snippet || fileContent}
          />
        ) : category === "markdown" ? (
          <WikiEditor
            key={selectedFile}
            content={fileContent}
            onSave={handleSave}
            filePath={selectedFile}
          />
        ) : (
          <FilePreview
            key={selectedFile}
            filePath={selectedFile}
            textContent={fileContent}
          />
        )}
      </div>
    </div>
  )
}

function ExternalReferencePreview({
  source,
  title,
  path,
  snippet,
}: {
  source: string
  title: string
  path: string
  snippet: string
}) {
  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
            {source}
          </span>
          <h3 className="truncate text-sm font-medium" title={title}>{title}</h3>
        </div>
        <div className="break-all rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {path}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border/60 bg-background p-4">
        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6">
          {snippet || "(No preview fragment returned.)"}
        </pre>
      </div>
    </div>
  )
}
