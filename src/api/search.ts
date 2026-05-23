import { requestJson } from "@/api/http"

export function searchEntries(params: { kbId: string; q: string }) {
  return requestJson<{ id: string; title: string; snippet?: string }[]>("/search", {
    query: params,
  })
}

