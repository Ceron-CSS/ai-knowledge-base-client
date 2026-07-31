import type { Kb } from "@/api/kb"
import type { ChunkPreviewMode, ChunkPreviewSeparator } from "@/api/kb"

export type KbEditingState = { mode: "create" } | { mode: "edit"; kb: Kb } | { mode: "none" }

export type KbUploadNavigationState = {
  itemId?: string
  fileName?: string
  text?: string
  chunks?: string[]
  /** 0-based chunk index from retrieval; used to highlight the target slice. */
  highlightChunkIndex?: number
  chunkConfig?: {
    mode: ChunkPreviewMode
    separators: ChunkPreviewSeparator[]
    maxLength: number
    trimSpaces: boolean
  }
}
