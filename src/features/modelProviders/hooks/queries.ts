import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createModelConfig, deleteModelConfig, listModelConfigs, updateModelConfig } from "@/api/models"
import { showDeleteFailureToast } from "@/lib/deleteError"
import { queryKeys } from "@/app/queryKeys"

const modelProviderKeys = {
  all: queryKeys.modelConfigs.root,
}

export function useModelConfigList() {
  return useQuery({
    queryKey: modelProviderKeys.all,
    queryFn: listModelConfigs,
  })
}

export function useCreateModelConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createModelConfig,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: modelProviderKeys.all })
    },
  })
}

export function useUpdateModelConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateModelConfig>[1] }) =>
      updateModelConfig(id, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: modelProviderKeys.all })
    },
  })
}

export function useDeleteModelConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, acknowledgeLinked }: { id: string; acknowledgeLinked?: boolean }) =>
      deleteModelConfig(id, { acknowledgeLinked }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: modelProviderKeys.all })
      await qc.invalidateQueries({ queryKey: queryKeys.assistants.root })
    },
    onError: (error) => showDeleteFailureToast(error),
  })
}
