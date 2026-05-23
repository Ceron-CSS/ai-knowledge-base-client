import { requestJson } from "@/api/http"

export type KbListItem = { id: string; name: string }

export function listKbs() {
  return requestJson<KbListItem[]>("/kb")
}

