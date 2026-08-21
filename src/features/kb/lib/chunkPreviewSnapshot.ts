import type { ChunkPreviewMode, ChunkPreviewSeparator } from "@/api/kb"

export type ChunkPreviewSnapshot = {
  text: string
  mode: ChunkPreviewMode
  separators: ChunkPreviewSeparator[]
  maxLength: number
  overlapLength: number
  parentMaxLength: number
  trimSpaces: boolean
}

export function chunkPreviewSnapshotMatches(
  current: ChunkPreviewSnapshot,
  snapshot: ChunkPreviewSnapshot | null,
): boolean {
  if (!snapshot) return false
  return (
    current.text === snapshot.text &&
    current.mode === snapshot.mode &&
    current.maxLength === snapshot.maxLength &&
    current.overlapLength === snapshot.overlapLength &&
    current.parentMaxLength === snapshot.parentMaxLength &&
    current.trimSpaces === snapshot.trimSpaces &&
    current.separators.length === snapshot.separators.length &&
    current.separators.every((separator, index) => separator === snapshot.separators[index])
  )
}
