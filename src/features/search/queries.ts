import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createModelConfig, deleteModelConfig, listModelConfigs, updateModelConfig } from "@/api/models"

const modelKeys = {
  all: ["model-configs"] as const,
}

export function useModelConfigList() {
  return useQuery({
    queryKey: modelKeys.all,
    queryFn: listModelConfigs,
  })
}

export function useCreateModelConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createModelConfig,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: modelKeys.all })
    },
  })
}

export function useUpdateModelConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateModelConfig>[1] }) => updateModelConfig(id, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: modelKeys.all })
    },
  })
}

export function useDeleteModelConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteModelConfig(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: modelKeys.all })
    },
  })
}
