import { requestJson } from "@/api/http"

export type EntryListItem = { id: string; title: string; kbId: string }

export function listEntries(params: { kbId: string }) {
  return requestJson<EntryListItem[]>("/entry", { query: params })
}

