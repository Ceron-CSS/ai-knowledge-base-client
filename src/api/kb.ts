import { requestJson } from "@/api/http"
import { HttpError } from "@/api/http"
import { getApiBaseUrl } from "@/app/env"
import { getAccessToken } from "@/features/auth/authStorage"

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
export type SortDir = "asc" | "desc"

export function listKbs(params: { enabled?: boolean; sortBy?: KbSortBy; sortDir?: SortDir } = {}) {
  return requestJson<Kb[]>("/kb", {
    query: {
      ...params,
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

export function setKbEnabled(id: string, enabled: boolean) {
  return requestJson<Kb>(`/kb/${id}`, { method: "PATCH", body: { enabled } })
}

export function deleteKb(id: string) {
  return requestJson<void>(`/kb/${id}`, { method: "DELETE" })
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

export function listKbItems(kbId: string) {
  return requestJson<KbItem[]>(`/kb/${kbId}/items`)
}

export type KbItemDetail = {
  id: string
  fileName: string
  content: string
  chunks: string[]
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

export async function streamKbChunkPreview(
  kbId: string,
  body: ChunkPreviewRequest,
  onChunk: (chunk: ChunkPreviewChunk) => void,
  signal?: AbortSignal,
) {
  const token = getAccessToken()
  const response = await fetch(`${getApiBaseUrl()}/kb/${kbId}/chunk-preview`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const payload = (await response.json()) as { message?: string }
      if (payload?.message) message = payload.message
    } catch {
      // ignore
    }
    throw new HttpError(response.status, message)
  }

  if (!response.body) return

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      onChunk(JSON.parse(trimmed) as ChunkPreviewChunk)
    }
  }

  const tail = buffer.trim()
  if (tail) onChunk(JSON.parse(tail) as ChunkPreviewChunk)
}

export type ExtractedFile = {
  fileName: string
  fileType: string
  text: string
}

export async function extractKbFileText(kbId: string, file: File): Promise<ExtractedFile> {
  const token = getAccessToken()
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${getApiBaseUrl()}/kb/${kbId}/extract-file`, {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
    body: formData,
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const payload = (await response.json()) as { message?: string }
      if (payload?.message) message = payload.message
    } catch {
      // ignore
    }
    throw new HttpError(response.status, message)
  }

  return (await response.json()) as ExtractedFile
}

export function createKbItem(
  kbId: string,
  body: { fileName: string; content: string; chunks: string[] },
) {
  return requestJson<{ id: string }>(`/kb/${kbId}/items`, { method: "POST", body })
}
