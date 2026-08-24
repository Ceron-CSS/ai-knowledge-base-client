import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  activateAgentPolicy,
  archiveAgentPolicy,
  cancelEvalRun,
  compareEvalRuns,
  createAgentPolicy,
  createEvalDataset,
  createEvalQuery,
  createEvalRun,
  deleteAgentPolicy,
  deleteEvalDataset,
  deleteEvalQuery,
  duplicateAgentPolicyActivation,
  duplicateAgentPolicy,
  getAgentPolicy,
  getEvalDataset,
  getEvalMetricTrends,
  getEvalRun,
  getEvalRunProgress,
  getEvalRunResult,
  listAgentPolicies,
  listAgentPolicyActivations,
  listEvalDatasets,
  listEvalQueries,
  listEvalRuns,
  patchAgentPolicy,
  patchEvalDataset,
  patchEvalQuery,
  type AgentPolicyConfig,
  type EvalRunCreateBody,
} from "@/api/evals"
import type { ListQuery } from "@/api/listQuery"
import { isEvalRunActive } from "@/features/evals/lib/labels"
import { showDeleteFailureToast } from "@/lib/deleteError"

export const evalKeys = {
  all: ["evals"] as const,
  datasets: () => [...evalKeys.all, "datasets"] as const,
  dataset: (id: string) => [...evalKeys.all, "dataset", id] as const,
  queries: (datasetId: string) => [...evalKeys.all, "queries", datasetId] as const,
  runs: (datasetId: string, params?: ListQuery) =>
    [...evalKeys.all, "runs", datasetId, params ?? {}] as const,
  run: (runId: string) => [...evalKeys.all, "run", runId] as const,
  runResult: (runId: string, resultId: string) =>
    [...evalKeys.all, "run", runId, "result", resultId] as const,
  trends: (datasetId: string, params?: Record<string, unknown>) =>
    [...evalKeys.all, "trends", datasetId, params ?? {}] as const,
  compare: (baselineRunId: string, candidateRunId: string) =>
    [...evalKeys.all, "compare", baselineRunId, candidateRunId] as const,
  policies: () => [...evalKeys.all, "agent-policies"] as const,
  policy: (policyId: string) => [...evalKeys.all, "agent-policy", policyId] as const,
  policyActivations: () => [...evalKeys.all, "agent-policy-activations"] as const,
}

export function useAgentPolicies(enabled = true) {
  return useQuery({
    queryKey: evalKeys.policies(),
    queryFn: listAgentPolicies,
    enabled,
  })
}

export function useAgentPolicyActivations(enabled = true) {
  return useQuery({
    queryKey: evalKeys.policyActivations(),
    queryFn: () => listAgentPolicyActivations(10),
    enabled,
  })
}

export function useAgentPolicy(policyId: string, enabled = true) {
  return useQuery({
    queryKey: evalKeys.policy(policyId),
    queryFn: () => getAgentPolicy(policyId),
    enabled: enabled && Boolean(policyId),
  })
}

async function invalidatePolicyQueries(qc: ReturnType<typeof useQueryClient>, policyId?: string) {
  await qc.invalidateQueries({ queryKey: evalKeys.policies() })
  await qc.invalidateQueries({ queryKey: evalKeys.policyActivations() })
  if (policyId) {
    await qc.invalidateQueries({ queryKey: evalKeys.policy(policyId) })
  }
}

export function useActivateAgentPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      policyId,
      evalRunId,
      note,
    }: {
      policyId: string
      evalRunId?: string
      note?: string
    }) => activateAgentPolicy(policyId, { evalRunId, note }),
    onSuccess: async (data) => {
      await invalidatePolicyQueries(qc, data.id)
    },
  })
}

export function useCreateAgentPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      name: string
      description?: string | null
      sourcePolicyId?: string
      config?: AgentPolicyConfig
    }) => createAgentPolicy(body),
    onSuccess: async (data) => {
      await invalidatePolicyQueries(qc, data.id)
    },
  })
}

export function useDuplicateAgentPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ policyId, name }: { policyId: string; name?: string }) =>
      duplicateAgentPolicy(policyId, { name }),
    onSuccess: async (data) => {
      await invalidatePolicyQueries(qc, data.id)
    },
  })
}

export function useDuplicateAgentPolicyActivation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ activationId, name }: { activationId: string; name?: string }) =>
      duplicateAgentPolicyActivation(activationId, { name }),
    onSuccess: async (data) => {
      await invalidatePolicyQueries(qc, data.id)
    },
  })
}

export function usePatchAgentPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      policyId,
      body,
    }: {
      policyId: string
      body: {
        name?: string
        description?: string | null
        config?: AgentPolicyConfig
      }
    }) => patchAgentPolicy(policyId, body),
    onSuccess: async (data) => {
      await invalidatePolicyQueries(qc, data.id)
    },
  })
}

export function useArchiveAgentPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ policyId }: { policyId: string }) => archiveAgentPolicy(policyId),
    onSuccess: async (data) => {
      await invalidatePolicyQueries(qc, data.id)
    },
  })
}

export function useDeleteAgentPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ policyId }: { policyId: string }) => deleteAgentPolicy(policyId),
    onSuccess: async (_data, variables) => {
      await invalidatePolicyQueries(qc, variables.policyId)
    },
    onError: (error) => showDeleteFailureToast(error),
  })
}

export function useEvalDatasets() {
  return useQuery({
    queryKey: evalKeys.datasets(),
    queryFn: listEvalDatasets,
  })
}

export function useEvalDataset(datasetId: string, enabled = true) {
  return useQuery({
    queryKey: evalKeys.dataset(datasetId),
    queryFn: () => getEvalDataset(datasetId),
    enabled: enabled && Boolean(datasetId),
  })
}

export function useEvalQueries(datasetId: string, enabled = true) {
  return useQuery({
    queryKey: evalKeys.queries(datasetId),
    queryFn: () => listEvalQueries(datasetId),
    enabled: enabled && Boolean(datasetId),
  })
}

export function useEvalRuns(datasetId: string, params: ListQuery = {}, enabled = true) {
  return useQuery({
    queryKey: evalKeys.runs(datasetId, params),
    queryFn: () => listEvalRuns(datasetId, params),
    enabled: enabled && Boolean(datasetId),
    refetchInterval: (query) => {
      const items = query.state.data?.items ?? []
      if (!items.some((run) => isEvalRunActive(run.status))) return false
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return 8000
      return 2000
    },
  })
}

export function useEvalRun(runId: string, enabled = true) {
  return useQuery({
    queryKey: evalKeys.run(runId),
    queryFn: () => getEvalRun(runId),
    enabled: enabled && Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status || !isEvalRunActive(status)) return false
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return 8000
      return 2000
    },
  })
}

export function useEvalRunResult(runId: string, resultId: string, enabled = true) {
  return useQuery({
    queryKey: evalKeys.runResult(runId, resultId),
    queryFn: () => getEvalRunResult(runId, resultId),
    enabled: enabled && Boolean(runId) && Boolean(resultId),
  })
}

export function useEvalRunProgress(runId: string, enabled = true) {
  return useQuery({
    queryKey: [...evalKeys.run(runId), "progress"] as const,
    queryFn: () => getEvalRunProgress(runId),
    enabled: enabled && Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (!status || !isEvalRunActive(status)) return false
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return 8000
      return 2000
    },
  })
}

export function useEvalMetricTrends(
  datasetId: string,
  params: {
    retrieverMode?: string
    topK?: number
    includeGeneration?: boolean
    limit?: number
  } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: evalKeys.trends(datasetId, params),
    queryFn: () => getEvalMetricTrends(datasetId, params),
    enabled: enabled && Boolean(datasetId),
  })
}

export function useCreateEvalDataset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createEvalDataset,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: evalKeys.datasets() })
    },
    onError: (error) => showDeleteFailureToast(error),
  })
}

export function usePatchEvalDataset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      datasetId,
      body,
    }: {
      datasetId: string
      body: { name?: string; description?: string | null }
    }) => patchEvalDataset(datasetId, body),
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: evalKeys.datasets() })
      await qc.invalidateQueries({ queryKey: evalKeys.dataset(data.id) })
    },
  })
}

export function useDeleteEvalDataset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ datasetId }: { datasetId: string }) => deleteEvalDataset(datasetId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: evalKeys.datasets() })
    },
  })
}

export function useCreateEvalQuery(datasetId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      question: string
      referenceAnswer?: string | null
      relevantChunkIds?: string[]
    }) => createEvalQuery(datasetId, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: evalKeys.queries(datasetId) })
      await qc.invalidateQueries({ queryKey: evalKeys.dataset(datasetId) })
      await qc.invalidateQueries({ queryKey: evalKeys.datasets() })
    },
    onError: (error) => showDeleteFailureToast(error),
  })
}

export function usePatchEvalQuery(datasetId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      queryId,
      body,
    }: {
      queryId: string
      body: {
        question?: string
        referenceAnswer?: string | null
        relevantChunkIds?: string[]
      }
    }) => patchEvalQuery(datasetId, queryId, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: evalKeys.queries(datasetId) })
      await qc.invalidateQueries({ queryKey: evalKeys.dataset(datasetId) })
    },
  })
}

export function useDeleteEvalQuery(datasetId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ queryId }: { queryId: string }) => deleteEvalQuery(datasetId, queryId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: evalKeys.queries(datasetId) })
      await qc.invalidateQueries({ queryKey: evalKeys.dataset(datasetId) })
      await qc.invalidateQueries({ queryKey: evalKeys.datasets() })
    },
  })
}

export function useCreateEvalRun(datasetId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: EvalRunCreateBody = {}) => createEvalRun(datasetId, body),
    onSuccess: async (run) => {
      await qc.invalidateQueries({ queryKey: evalKeys.runs(datasetId) })
      await qc.invalidateQueries({ queryKey: evalKeys.trends(datasetId) })
      await qc.invalidateQueries({ queryKey: evalKeys.run(run.id) })
    },
  })
}

export function useCancelEvalRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ runId }: { runId: string }) => cancelEvalRun(runId),
    onSuccess: async (run) => {
      await qc.invalidateQueries({ queryKey: evalKeys.run(run.id) })
      await qc.invalidateQueries({ queryKey: evalKeys.runs(run.datasetId) })
      await qc.invalidateQueries({ queryKey: [...evalKeys.run(run.id), "progress"] })
    },
  })
}

export function useEvalRunCompare(
  baselineRunId: string,
  candidateRunId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: evalKeys.compare(baselineRunId, candidateRunId),
    queryFn: () => compareEvalRuns(baselineRunId, candidateRunId),
    enabled: enabled && Boolean(baselineRunId) && Boolean(candidateRunId),
  })
}
