import { requestJson } from "@/api/http"

export type DashboardStats = {
  kbCount: { total: number; enabled: number }
  itemCount: number
  assistantCount: { total: number; published: number }
  modelConfigCount: number
  dailyRequests: Array<{ date: string; count: number }>
  kbDocDist: Array<{ name: string; docCount: number }>
}

export function getDashboardStats() {
  return requestJson<DashboardStats>("/api/stats")
}
