import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createKb, deleteKb, listKbs, setKbEnabled, updateKb, type KbSortBy, type SortDir } from "@/api/kb"

const kbKeys = {
  all: ["kb"] as const,
  list: (params: { enabled?: boolean; sortBy?: KbSortBy; sortDir?: SortDir }) => ["kb", "list", params] as const,
}

const EMPTY_LIST_PARAMS: { enabled?: boolean; sortBy?: KbSortBy; sortDir?: SortDir } = {}

export function useKbList(params?: { enabled?: boolean; sortBy?: KbSortBy; sortDir?: SortDir }) {
  const effectiveParams = params ?? EMPTY_LIST_PARAMS
  return useQuery({
    queryKey: kbKeys.list(effectiveParams),
    queryFn: () => listKbs(effectiveParams),
  })
}

export function useCreateKb() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createKb,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: kbKeys.all })
    },
  })
}

export function useUpdateKb() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name: string; description?: string } }) =>
      updateKb(id, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: kbKeys.all })
    },
  })
}

export function useSetKbEnabled() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => setKbEnabled(id, enabled),
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: kbKeys.all })
      if (!vars.enabled) {
        await qc.invalidateQueries({ queryKey: ["assistants"] })
      }
    },
  })
}

export function useDeleteKb() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteKb(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: kbKeys.all })
    },
  })
}
