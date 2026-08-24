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

export function getKb(id: string) {
  return requestJson<Kb>(`/kb/${id}`)
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
  status?: string
  indexingStatus?: "ready" | "indexing" | "failed" | "disabled"
  hasOriginalFile?: boolean
  previewMode?: "original" | "text"
  createdAt: string
  updatedAt: string
}

export type KbItemWithKb = KbItem & {
  kbId: string
  kbName: string
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

export function listAllKbItems(params: KbItemListParams = {}) {
  const listParams = listQueryToSearchParams(params)
  return requestJson<PaginatedResult<KbItemWithKb>>("/kb/items", {
    query: {
      ...listParams,
      sortBy: params.sortBy ?? "createdAt",
      sortDir: params.sortDir ?? "desc",
    },
  })
}

export type KbItemChunkRecord = {
  index: number
  text: string
  pageStart?: number | null
  pageEnd?: number | null
  sourceKind?: string | null
  chunkId: string
}

export type KbItemDetail = {
  id: string
  fileName: string
  content: string
  chunks: string[]
  chunkRecords?: KbItemChunkRecord[]
  chunkConfig?: ChunkPreviewConfig
  status?: string
  pageRevision?: string | null
  hasOriginalFile?: boolean
  previewMode?: "original" | "text"
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

export type ChunkPreviewMode =
  | "smart"
  | "advanced"
  | "recursive"
  | "token"
  | "sliding"
  | "structure"
  | "parent_child"
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
  overlapLength: number
  parentMaxLength: number
  trimSpaces: boolean
}

export type ChunkPreviewConfig = Omit<ChunkPreviewRequest, "text">

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

export type ImportItemResponse = {
  itemId: string
  status: string
  fileName: string
}

export async function importKbItem(
  kbId: string,
  file: File,
  options?: { allowDuplicate?: boolean },
): Promise<ImportItemResponse> {
  const formData = new FormData()
  formData.append("file", file)
  const response = await authenticatedFetch(`/kb/${kbId}/items/import`, {
    method: "POST",
    body: formData,
    query: options?.allowDuplicate ? { allowDuplicate: true } : undefined,
  })
  await throwIfNotOk(response)
  return (await response.json()) as ImportItemResponse
}

export type IngestionWarning = {
  pageNumber: number
  errorCode?: string | null
  extractionMethod: string
}

export type IngestionStatus = {
  itemId: string
  status: string
  pageRevision?: string | null
  pageCount?: number | null
  progressCurrent?: number | null
  progressTotal?: number | null
  errorCode?: string | null
  warnings: IngestionWarning[]
  heartbeatAt?: string | null
  expiresAt?: string | null
  canRetryExtraction: boolean
  canRetryIndexing: boolean
  hasOriginalFile: boolean
  previewMode: "original" | "text"
}

export function getKbItemIngestion(kbId: string, itemId: string) {
  return requestJson<IngestionStatus>(`/kb/${kbId}/items/${itemId}/ingestion`)
}

export type KbItemPage = {
  pageNumber: number
  text: string
  extractionMethod: string
  errorCode?: string | null
  width?: number | null
  height?: number | null
}

export function listKbItemPages(kbId: string, itemId: string) {
  return requestJson<KbItemPage[]>(`/kb/${kbId}/items/${itemId}/pages`)
}

export type ItemChunkPreviewChunk = ChunkPreviewChunk & {
  pageStart?: number
  pageEnd?: number
  sourceKind?: string
}

export type ItemChunkPreviewMeta = {
  pageRevision: string
  configHash: string
}

export async function streamKbItemChunkPreview(
  kbId: string,
  itemId: string,
  body: ChunkPreviewConfig,
  onMeta: (meta: ItemChunkPreviewMeta) => void,
  onChunk: (chunk: ItemChunkPreviewChunk) => void,
  signal?: AbortSignal,
) {
  const response = await authenticatedFetch(`/kb/${kbId}/items/${itemId}/chunk-preview`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })

  await readNdjsonStream(response, onChunk, (parsed) => {
    if (!parsed || typeof parsed !== "object") return null
    const row = parsed as Record<string, unknown>
    if (row.type === "meta") {
      if (typeof row.pageRevision === "string" && typeof row.configHash === "string") {
        onMeta({ pageRevision: row.pageRevision, configHash: row.configHash })
      }
      return null
    }
    const chunk = parseChunkPreviewChunk(row)
    if (!chunk) return null
    return {
      ...chunk,
      pageStart: typeof row.pageStart === "number" ? row.pageStart : undefined,
      pageEnd: typeof row.pageEnd === "number" ? row.pageEnd : undefined,
      sourceKind: typeof row.sourceKind === "string" ? row.sourceKind : undefined,
    }
  })
}

export function finalizeKbItem(
  kbId: string,
  itemId: string,
  body: {
    chunkConfig: ChunkPreviewConfig
    pageRevision: string
    configHash: string
  },
) {
  return requestJson<{ itemId: string; status: string }>(`/kb/${kbId}/items/${itemId}/finalize`, {
    method: "POST",
    body,
  })
}

export function retryKbItemExtraction(kbId: string, itemId: string) {
  return requestJson<{ itemId: string; status: string }>(
    `/kb/${kbId}/items/${itemId}/retry-extraction`,
    { method: "POST" },
  )
}

export function retryKbItemIndexing(kbId: string, itemId: string) {
  return requestJson<{ itemId: string; status: string }>(
    `/kb/${kbId}/items/${itemId}/retry-indexing`,
    { method: "POST" },
  )
}

export async function fetchKbItemFileBytes(kbId: string, itemId: string): Promise<ArrayBuffer> {
  const response = await authenticatedFetch(`/kb/${kbId}/items/${itemId}/file`)
  await throwIfNotOk(response)
  return response.arrayBuffer()
}

export function createKbItem(
  kbId: string,
  body: {
    fileName: string
    content: string
    chunks: string[]
    chunkConfig?: ChunkPreviewConfig
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
    chunkConfig?: ChunkPreviewConfig
  },
) {
  return requestJson<void>(`/kb/${kbId}/items/${itemId}`, { method: "PATCH", body })
}
