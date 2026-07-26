import { useQuery } from "@tanstack/react-query"
import { getDashboardStats } from "@/api/stats"

const dashboardStatsKey = ["dashboard-stats"] as const

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardStatsKey,
    queryFn: getDashboardStats,
  })
}
