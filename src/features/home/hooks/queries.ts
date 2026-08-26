import { useQuery } from "@tanstack/react-query"
import { getDashboardStats } from "@/api/stats"
import { queryKeys } from "@/app/queryKeys"

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: getDashboardStats,
    staleTime: 60_000,
  })
}
