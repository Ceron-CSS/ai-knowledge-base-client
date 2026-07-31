import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createAssistant,
  createAndPublishAssistant,
  deleteAssistant,
  getAssistant,
  listAssistants,
  publishAssistant,
  unpublishAssistant,
  updateAssistant,
} from "@/api/assistants"

const assistantKeys = {
  all: ["assistants"] as const,
  byId: (id: string) => ["assistants", id] as const,
}

export function useAssistantList() {
  return useQuery({
    queryKey: assistantKeys.all,
    queryFn: listAssistants,
  })
}

export function useAssistant(id: string, enabled: boolean) {
  return useQuery({
    queryKey: assistantKeys.byId(id),
    queryFn: () => getAssistant(id),
    enabled,
  })
}

export function useCreateAssistant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createAssistant,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: assistantKeys.all })
    },
  })
}

export function useCreateAndPublishAssistant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createAndPublishAssistant,
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: assistantKeys.all })
      await qc.invalidateQueries({ queryKey: assistantKeys.byId(data.id) })
    },
  })
}

export function useUpdateAssistant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateAssistant>[1] }) =>
      updateAssistant(id, body),
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: assistantKeys.all })
      await qc.invalidateQueries({ queryKey: assistantKeys.byId(vars.id) })
    },
  })
}

export function usePublishAssistant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string }) => publishAssistant(id),
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: assistantKeys.all })
      await qc.invalidateQueries({ queryKey: assistantKeys.byId(vars.id) })
    },
  })
}

export function useUnpublishAssistant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string }) => unpublishAssistant(id),
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: assistantKeys.all })
      await qc.invalidateQueries({ queryKey: assistantKeys.byId(vars.id) })
    },
  })
}

export function useDeleteAssistant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteAssistant(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: assistantKeys.all })
    },
  })
}
