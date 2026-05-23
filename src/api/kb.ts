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

export function listKbs() {
  return requestJson<Kb[]>("/kb")
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
