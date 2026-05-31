import { requestJson } from "@/api/http"

export type DashboardStats = {
  kbCount: { total: number; enabled: number }
  itemCount: number
  assistantCount: { total: number; published: number }
  modelConfigCount: number
  kbDocs: Array<{ name: string; docCount: number; charCount: number }>
  recentKbs: Array<{ id: string; name: string; updatedAt: string }>
}

export function getDashboardStats() {
  return requestJson<DashboardStats>("/api/stats")
}
