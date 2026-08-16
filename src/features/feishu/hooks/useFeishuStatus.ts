import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { disconnectFeishu, getFeishuStatus } from "@/api/feishu"

const feishuKeys = {
  status: ["feishu", "status"] as const,
}

export function useFeishuStatus() {
  return useQuery({
    queryKey: feishuKeys.status,
    queryFn: getFeishuStatus,
    staleTime: 30_000,
  })
}

export function useRefetchFeishuStatus() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: feishuKeys.status })
}

export function useDisconnectFeishu() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: disconnectFeishu,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: feishuKeys.status }),
  })
}
