import { open } from "@tauri-apps/plugin-dialog"
import type { WikiProject } from "@/types/wiki"
import type { LlmConfig, SourceWatchConfig } from "@/stores/wiki-store"
import { importSourceFiles, importSourceFolder } from "./source-lifecycle"

/**
 * Native file-picker filters shared by every import entry point — the
 * Sources view's import buttons AND the Knowledge view's "文件导入"
 * gateway. Lives here (not duplicated in each caller) so the two surfaces
 * can't drift on which extensions are pickable. Values are byte-for-byte
 * the same list the Sources view used inline before this extraction.
 */
export const IMPORT_FILE_FILTERS = [
  {
    name: "Documents",
    extensions: [
      "md", "mdx", "txt", "org", "rtf", "pdf",
      "html", "htm", "xml",
      "doc", "docx", "xls", "xlsx", "ppt", "pptx",
      "odt", "ods", "odp", "epub", "mobi", "pages", "numbers", "key",
    ],
  },
  {
    name: "Data",
    extensions: ["json", "jsonl", "csv", "tsv", "yaml", "yml", "ndjson"],
  },
  {
    name: "Code",
    extensions: [
      "py", "js", "ts", "jsx", "tsx", "rs", "go", "java",
      "c", "cpp", "h", "rb", "php", "swift", "sql", "sh",
    ],
  },
  {
    name: "Images",
    extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "tiff", "avif", "heic"],
  },
  {
    name: "Media",
    extensions: ["mp4", "webm", "mov", "avi", "mkv", "mp3", "wav", "ogg", "flac", "m4a"],
  },
  { name: "All Files", extensions: ["*"] },
]

/**
 * Open the native multi-file picker and import the chosen files into the
 * project's raw/sources via the same `importSourceFiles` the Sources view
 * uses. Returns true when files were actually imported (caller should
 * refresh the source surface / navigate to the Sources view); false when
 * the user cancelled the picker.
 *
 * `titleFiles` is the picker dialog title — i18n is resolved by the caller
 * so this module stays free of react-i18next. This is the single import
 * code path so the Knowledge "文件导入" entry and the Sources view can never
 * diverge on how files are imported.
 */
export async function pickAndImportFiles(
  project: WikiProject,
  llmConfig: LlmConfig,
  sourceWatchConfig: SourceWatchConfig | undefined,
  titleFiles: string,
): Promise<boolean> {
  const selected = await open({ multiple: true, title: titleFiles, filters: IMPORT_FILE_FILTERS })
  if (!selected || (Array.isArray(selected) && selected.length === 0)) return false
  const paths = Array.isArray(selected) ? selected : [selected]
  await importSourceFiles(project, paths, llmConfig, sourceWatchConfig)
  return true
}

/**
 * Open the native folder picker and import the chosen folder via the same
 * `importSourceFolder` the Sources view uses. Same return contract as
 * `pickAndImportFiles`.
 */
export async function pickAndImportFolder(
  project: WikiProject,
  llmConfig: LlmConfig,
  sourceWatchConfig: SourceWatchConfig | undefined,
  titleFolder: string,
): Promise<boolean> {
  const selected = await open({ directory: true, title: titleFolder })
  if (!selected || typeof selected !== "string") return false
  await importSourceFolder(project, selected, llmConfig, sourceWatchConfig)
  return true
}
