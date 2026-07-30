import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createKb,
  deleteKb,
  deleteKbItem,
  listKbItems,
  listKbs,
  setKbEnabled,
  setKbItemEnabled,
  updateKb,
  type KbSortBy,
  type SortDir,
} from "@/api/kb"

const kbKeys = {
  all: ["kb"] as const,
  list: (params: { enabled?: boolean; sortBy?: KbSortBy; sortDir?: SortDir }) => ["kb", "list", params] as const,
  items: (kbId: string) => ["kb", "items", kbId] as const,
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
    mutationFn: ({
      id,
      enabled,
      acknowledgeLinked,
    }: {
      id: string
      enabled: boolean
      acknowledgeLinked?: boolean
    }) => setKbEnabled(id, enabled, { acknowledgeLinked }),
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
    mutationFn: ({ id, acknowledgeLinked }: { id: string; acknowledgeLinked?: boolean }) =>
      deleteKb(id, { acknowledgeLinked }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: kbKeys.all })
      await qc.invalidateQueries({ queryKey: ["assistants"] })
    },
  })
}

export function useKbItems(kbId: string) {
  return useQuery({
    queryKey: kbKeys.items(kbId),
    queryFn: () => listKbItems(kbId),
    enabled: !!kbId,
  })
}

export function useSetKbItemEnabled() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ kbId, itemId, enabled }: { kbId: string; itemId: string; enabled: boolean }) =>
      setKbItemEnabled(kbId, itemId, enabled),
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: kbKeys.items(vars.kbId) })
    },
  })
}

export function useDeleteKbItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ kbId, itemId }: { kbId: string; itemId: string }) => deleteKbItem(kbId, itemId),
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: kbKeys.items(vars.kbId) })
      await qc.invalidateQueries({ queryKey: kbKeys.all })
    },
  })
}
