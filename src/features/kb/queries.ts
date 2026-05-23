import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createKb, deleteKb, listKbs, setKbEnabled, updateKb } from "@/api/kb"

const kbKeys = {
  all: ["kb"] as const,
}

export function useKbList() {
  return useQuery({
    queryKey: kbKeys.all,
    queryFn: listKbs,
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
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: kbKeys.all })
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
