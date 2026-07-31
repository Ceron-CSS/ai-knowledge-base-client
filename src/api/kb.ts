import { authenticatedFetch, requestJson, throwIfNotOk } from "@/api/http"
import { readNdjsonStream } from "@/api/http-stream"
import {
  listQueryToSearchParams,
  type ListQuery,
  type PaginatedResult,
  type SortDir,
} from "@/api/listQuery"

export type Kb = {
  id: string
  name: string
  description?: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
  docCount: number
  charCount: number
}

export type KbSortBy = "updatedAt" | "createdAt" | "name"
export type { SortDir, PaginatedResult, ListQuery }

export type KbListParams = ListQuery & {
  enabled?: boolean
  sortBy?: KbSortBy
  sortDir?: SortDir
}

export function listKbs(params: KbListParams = {}) {
  const listParams = listQueryToSearchParams(params)
  return requestJson<PaginatedResult<Kb>>("/kb", {
    query: {
      ...listParams,
      enabled: params.enabled,
      sortBy: params.sortBy ?? "createdAt",
      sortDir: params.sortDir ?? "desc",
    },
  })
}

export function createKb(body: { name: string; description?: string }) {
  return requestJson<Kb>("/kb", { method: "POST", body })
}

export function updateKb(id: string, body: { name: string; description?: string }) {
  return requestJson<Kb>(`/kb/${id}`, { method: "PATCH", body })
}

export function setKbEnabled(
  id: string,
  enabled: boolean,
  options?: { acknowledgeLinked?: boolean },
) {
  return requestJson<Kb>(`/kb/${id}`, {
    method: "PATCH",
    body: {
      enabled,
      ...(options?.acknowledgeLinked ? { acknowledgeLinked: true } : {}),
    },
  })
}

export function deleteKb(id: string, options?: { acknowledgeLinked?: boolean }) {
  return requestJson<void>(`/kb/${id}`, {
    method: "DELETE",
    query: options?.acknowledgeLinked ? { acknowledgeLinked: true } : undefined,
  })
}

export type KbLinkedAssistant = {
  id: string
  name: string
  published: boolean
}

export function getKbLinkedAssistants(id: string) {
  return requestJson<KbLinkedAssistant[]>(`/kb/${id}/assistants`)
}

export type KbItem = {
  id: string
  fileName: string
  charCount: number
  chunkCount: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export type KbItemSortBy = "updatedAt" | "createdAt" | "fileName"

export type KbItemListParams = ListQuery & {
  sortBy?: KbItemSortBy
  sortDir?: SortDir
}

export function listKbItems(kbId: string, params: KbItemListParams = {}) {
  const listParams = listQueryToSearchParams(params)
  return requestJson<PaginatedResult<KbItem>>(`/kb/${kbId}/items`, {
    query: {
      ...listParams,
      sortBy: params.sortBy ?? "createdAt",
      sortDir: params.sortDir ?? "desc",
    },
  })
}

export type KbItemDetail = {
  id: string
  fileName: string
  content: string
  chunks: string[]
  chunkConfig?: {
    mode: ChunkPreviewMode
    separators: ChunkPreviewSeparator[]
    maxLength: number
    trimSpaces: boolean
  }
}

export function getKbItemDetail(kbId: string, itemId: string) {
  return requestJson<KbItemDetail>(`/kb/${kbId}/items/${itemId}`)
}

export function setKbItemEnabled(kbId: string, itemId: string, enabled: boolean) {
  return requestJson<void>(`/kb/${kbId}/items/${itemId}`, { method: "PATCH", body: { enabled } })
}

export function deleteKbItem(kbId: string, itemId: string) {
  return requestJson<void>(`/kb/${kbId}/items/${itemId}`, { method: "DELETE" })
}

export type ChunkPreviewMode = "smart" | "advanced"
export type ChunkPreviewSeparator =
  | "newline"
  | "markdown_h1"
  | "markdown_h2"
  | "markdown_h3"
  | "markdown_h4"
  | "numbered_list"
  | "chinese_numbered_list"

export type ChunkPreviewRequest = {
  text: string
  mode: ChunkPreviewMode
  separators: ChunkPreviewSeparator[]
  maxLength: number
  trimSpaces: boolean
}

export type ChunkPreviewChunk = {
  index: number
  charCount: number
  text: string
}

function parseChunkPreviewChunk(parsed: unknown): ChunkPreviewChunk | null {
  if (!parsed || typeof parsed !== "object") return null
  const chunk = parsed as Record<string, unknown>
  if (typeof chunk.index !== "number" || typeof chunk.charCount !== "number" || typeof chunk.text !== "string") {
    return null
  }
  return { index: chunk.index, charCount: chunk.charCount, text: chunk.text }
}

export async function streamKbChunkPreview(
  kbId: string,
  body: ChunkPreviewRequest,
  onChunk: (chunk: ChunkPreviewChunk) => void,
  signal?: AbortSignal,
) {
  const response = await authenticatedFetch(`/kb/${kbId}/chunk-preview`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })

  await readNdjsonStream(response, onChunk, parseChunkPreviewChunk)
}

export async function fetchKbChunkPreview(
  kbId: string,
  body: ChunkPreviewRequest,
  signal?: AbortSignal,
): Promise<ChunkPreviewChunk[]> {
  const chunks: ChunkPreviewChunk[] = []
  await streamKbChunkPreview(kbId, body, (chunk) => chunks.push(chunk), signal)
  return chunks
}

export type ExtractedFile = {
  fileName: string
  fileType: string
  text: string
}

export async function extractKbFileText(kbId: string, file: File): Promise<ExtractedFile> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await authenticatedFetch(`/kb/${kbId}/extract-file`, {
    method: "POST",
    body: formData,
  })

  await throwIfNotOk(response)
  return (await response.json()) as ExtractedFile
}

export function createKbItem(
  kbId: string,
  body: {
    fileName: string
    content: string
    chunks: string[]
    chunkConfig?: {
      mode: ChunkPreviewMode
      separators: ChunkPreviewSeparator[]
      maxLength: number
      trimSpaces: boolean
    }
  },
) {
  return requestJson<{ id: string }>(`/kb/${kbId}/items`, { method: "POST", body })
}

export function updateKbItem(
  kbId: string,
  itemId: string,
  body: {
    fileName: string
    content: string
    chunks: string[]
    chunkConfig?: {
      mode: ChunkPreviewMode
      separators: ChunkPreviewSeparator[]
      maxLength: number
      trimSpaces: boolean
    }
  },
) {
  return requestJson<void>(`/kb/${kbId}/items/${itemId}`, { method: "PATCH", body })
}
