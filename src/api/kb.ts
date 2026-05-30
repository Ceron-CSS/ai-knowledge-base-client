import { requestJson } from "@/api/http"

export type Kb = {
  id: string
  name: string
  description?: string | null
  enabled: boolean
  createdAt: string
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
