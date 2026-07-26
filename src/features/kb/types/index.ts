import type { Kb } from "@/api/kb"
import type { ChunkPreviewMode, ChunkPreviewSeparator } from "@/api/kb"

export type KbEditingState = { mode: "create" } | { mode: "edit"; kb: Kb } | { mode: "none" }

export type KbUploadNavigationState = {
  itemId?: string
  fileName?: string
  text?: string
  chunks?: string[]
  chunkConfig?: {
    mode: ChunkPreviewMode
    separators: ChunkPreviewSeparator[]
    maxLength: number
    trimSpaces: boolean
  }
}
