import type { Kb } from "@/api/kb"
import type { ChunkPreviewConfig } from "@/api/kb"

export type KbEditingState = { mode: "create" } | { mode: "edit"; kb: Kb } | { mode: "none" }

export type KbUploadNavigationState = {
  itemId?: string
  fileName?: string
  text?: string
  chunks?: string[]
  /** 0-based chunk index from retrieval; used to highlight the target slice. */
  highlightChunkIndex?: number
  /** 1-based PDF page from citation. */
  sourcePage?: number
  chunkConfig?: ChunkPreviewConfig
  /** File-import flow: wait for extraction then configure chunks. */
  ingestItemId?: string
  mode?: "manual" | "import"
}
