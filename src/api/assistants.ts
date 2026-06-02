import { requestJson } from "@/api/http"

export type Assistant = {
  id: string
  name: string
  description: string | null
  modelProvider: string
  modelConfigId: string | null
  baseModel: string | null
  systemPrompt: string | null
  kbIds: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

export function listAssistants() {
  return requestJson<Assistant[]>("/assistants")
}

export function getAssistant(id: string) {
  return requestJson<Assistant>(`/assistants/${id}`)
}

export function createAssistant(body: {
  name: string
  description?: string
  modelConfigId: string
  baseModel: string
  systemPrompt?: string
  kbIds: string[]
}) {
  return requestJson<Assistant>("/assistants", { method: "POST", body })
}

export function updateAssistant(
  id: string,
  body: {
    name?: string
    description?: string | null
    modelConfigId?: string
    baseModel?: string
    systemPrompt?: string | null
    kbIds?: string[]
  },
) {
  return requestJson<Assistant>(`/assistants/${id}`, { method: "PATCH", body })
}

export function publishAssistant(id: string) {
  return requestJson<Assistant>(`/assistants/${id}/publish`, { method: "POST" })
}

export function unpublishAssistant(id: string) {
  return requestJson<Assistant>(`/assistants/${id}/unpublish`, { method: "POST" })
}

export function deleteAssistant(id: string) {
  return requestJson<void>(`/assistants/${id}`, { method: "DELETE" })
}
