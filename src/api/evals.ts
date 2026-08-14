import { requestJson } from "@/api/http"
import { listQueryToSearchParams, type ListQuery, type PaginatedResult } from "@/api/listQuery"

export type EvalDataset = {
  id: string
  name: string
  description: string | null
  queryCount: number
  createdAt: string
  updatedAt: string
}

export type EvalQuery = {
  id: string
  datasetId: string
  question: string
  referenceAnswer: string | null
  relevantChunkIds: string[]
  questionType: string | null
  shouldAbstain: boolean
  createdAt: string
  updatedAt: string
}

export type EvalRunMetrics = Record<string, unknown>

export type EvalExecutionMode = "retrieval" | "workflow" | "agent" | "auto"

export type AgentPolicyConfig = {
  defaultExecutionMode?: string
  allowedRetrievalModes?: string[]
  defaultTopK?: number
  maxTopK?: number
  maxRetrievalPasses?: number
  maxToolCalls?: number
  maxPlannerCalls?: number
  defaultRetrieverMode?: string
  runtimeVersion?: string
  promptVersions?: {
    planner?: string
    answer?: string
    evidence?: string
  }
  rerank?: {
    enabled?: boolean
    maxCandidates?: number
    maxReranked?: number
  }
  contextExpansion?: {
    enabled?: boolean
    maxNeighborChunks?: number
    maxChunksPerDocument?: number
  }
  evidenceVerification?: {
    enabled?: boolean
    minConfidence?: number
    allowNoAnswer?: boolean
  }
  [key: string]: unknown
}

export type AgentPolicyListItem = {
  id: string
  name: string
  version: string
  status: string
  description: string
  config?: AgentPolicyConfig
  activatedAt?: string | null
  activationId?: string | null
  evalRunId?: string | null
  lastEvalRunId?: string | null
  sourcePolicyId?: string | null
  isSeed?: boolean
  isActive?: boolean
  editable?: boolean
  createdBy?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type AgentPolicyActivationHistoryItem = {
  id: string
  policyId: string
  policyName: string
  version: string | null
  isActive: boolean
  evalRunId: string | null
  note: string | null
  activatedBy: string | null
  activatedAt: string | null
  supersededAt: string | null
}

export type EvalRun = {
  id: string
  datasetId: string
  name: string | null
  retrieverMode: string
  topK: number
  includeGeneration: boolean
  executionMode: EvalExecutionMode | string
  assistantId: string | null
  modelConfigId: string | null
  kbIds: string[] | null
  status: string
  metrics: EvalRunMetrics
  resultCount: number
  progressCompleted: number
  progressTotal: number
  errorCount: number
  cancelRequested: boolean
  heartbeatAt: string | null
  configSnapshot: Record<string, unknown> | null
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
}

export type EvalRunProgress = {
  runId: string
  status: string
  progressCompleted: number
  progressTotal: number
  errorCount: number
  cancelRequested: boolean
  startedAt: string | null
  finishedAt: string | null
  heartbeatAt: string | null
}

export type EvalRunResult = {
  id: string
  runId: string
  queryId: string
  retrievedChunkIds: string[]
  relevantChunkIds: string[]
  metrics: EvalRunMetrics
  generatedAnswer: string | null
  citations: Array<Record<string, unknown>>
  error: string | null
  agentRunId: string | null
  status: string
  durationMs: number | null
  createdAt: string
}

export type EvalRunDetail = EvalRun & {
  results: EvalRunResult[]
}

export type EvalRunResultDetail = EvalRunResult & {
  datasetId: string
  question: string
  referenceAnswer: string | null
}

export type EvalMetricTrendPoint = {
  runId: string
  name: string | null
  status: string
  createdAt: string
  metrics: EvalRunMetrics
}

export type EvalMetricTrendSeries = {
  retrieverMode: string
  topK: number
  includeGeneration: boolean
  kbIds: string[] | null
  points: EvalMetricTrendPoint[]
}

export type EvalMetricTrendResponse = {
  datasetId: string
  series: EvalMetricTrendSeries[]
}

export type EvalRunCreateBody = {
  name?: string
  retrieverMode?: string
  topK?: number
  includeGeneration?: boolean
  executionMode?: EvalExecutionMode
  agentPolicyId?: string
  assistantId?: string
  modelConfigId?: string
  baseModel?: string
  kbIds?: string[] | null
  includeFaithfulness?: boolean
  includeAnswerRelevancy?: boolean
  includeCitationSupport?: boolean
}

export type EvalRunListResult = PaginatedResult<EvalRun> & {
  hasMore?: boolean
}

export function listEvalDatasets() {
  return requestJson<EvalDataset[]>("/evals/datasets")
}

export function getEvalDataset(datasetId: string) {
  return requestJson<EvalDataset>(`/evals/datasets/${datasetId}`)
}

export function createEvalDataset(body: { name: string; description?: string }) {
  return requestJson<EvalDataset>("/evals/datasets", { method: "POST", body })
}

export function patchEvalDataset(
  datasetId: string,
  body: { name?: string; description?: string | null },
) {
  return requestJson<EvalDataset>(`/evals/datasets/${datasetId}`, { method: "PATCH", body })
}

export function deleteEvalDataset(datasetId: string) {
  return requestJson<void>(`/evals/datasets/${datasetId}`, { method: "DELETE" })
}

export function listEvalQueries(datasetId: string) {
  return requestJson<EvalQuery[]>(`/evals/datasets/${datasetId}/queries`)
}

export function createEvalQuery(
  datasetId: string,
  body: {
    question: string
    referenceAnswer?: string | null
    relevantChunkIds?: string[]
    questionType?: string | null
    shouldAbstain?: boolean
  },
) {
  return requestJson<EvalQuery>(`/evals/datasets/${datasetId}/queries`, {
    method: "POST",
    body,
  })
}

export type EvalFeedbackType =
  | "answer_incorrect"
  | "citation_not_supporting"
  | "missing_expected_source"
  | "should_have_abstained"

export function createEvalQueryFromAssistantMessage(
  datasetId: string,
  body: {
    assistantId: string
    conversationId: string
    messageId: string
    feedbackType: EvalFeedbackType
  },
) {
  return requestJson<EvalQuery>(`/evals/datasets/${datasetId}/queries/from-assistant-message`, {
    method: "POST",
    body,
  })
}

export function patchEvalQuery(
  datasetId: string,
  queryId: string,
  body: {
    question?: string
    referenceAnswer?: string | null
    relevantChunkIds?: string[]
    questionType?: string | null
    shouldAbstain?: boolean
  },
) {
  return requestJson<EvalQuery>(`/evals/datasets/${datasetId}/queries/${queryId}`, {
    method: "PATCH",
    body,
  })
}

export function deleteEvalQuery(datasetId: string, queryId: string) {
  return requestJson<void>(`/evals/datasets/${datasetId}/queries/${queryId}`, {
    method: "DELETE",
  })
}

export function listEvalRuns(datasetId: string, params: ListQuery = {}) {
  return requestJson<EvalRunListResult>(`/evals/datasets/${datasetId}/runs`, {
    query: listQueryToSearchParams(params),
  })
}

export function listAgentPolicies() {
  return requestJson<AgentPolicyListItem[]>("/evals/agent-policies")
}

export function getAgentPolicy(policyId: string) {
  return requestJson<AgentPolicyListItem>(`/evals/agent-policies/${policyId}`)
}

export function getActiveAgentPolicy() {
  return requestJson<AgentPolicyListItem>("/evals/agent-policies/active")
}

export function listAgentPolicyActivations(limit = 20) {
  return requestJson<AgentPolicyActivationHistoryItem[]>("/evals/agent-policies/activations", {
    query: { limit },
  })
}

export function createAgentPolicy(body: {
  name: string
  description?: string | null
  sourcePolicyId?: string
  config?: AgentPolicyConfig
}) {
  return requestJson<AgentPolicyListItem>("/evals/agent-policies", {
    method: "POST",
    body,
  })
}

export function patchAgentPolicy(
  policyId: string,
  body: {
    name?: string
    description?: string | null
    config?: AgentPolicyConfig
  },
) {
  return requestJson<AgentPolicyListItem>(`/evals/agent-policies/${policyId}`, {
    method: "PATCH",
    body,
  })
}

export function duplicateAgentPolicy(policyId: string, body: { name?: string } = {}) {
  return requestJson<AgentPolicyListItem>(`/evals/agent-policies/${policyId}/duplicate`, {
    method: "POST",
    body,
  })
}

export function duplicateAgentPolicyActivation(activationId: string, body: { name?: string } = {}) {
  return requestJson<AgentPolicyListItem>(
    `/evals/agent-policies/activations/${activationId}/duplicate`,
    {
      method: "POST",
      body,
    },
  )
}

export function archiveAgentPolicy(policyId: string) {
  return requestJson<AgentPolicyListItem>(`/evals/agent-policies/${policyId}/archive`, {
    method: "POST",
  })
}

export function deleteAgentPolicy(policyId: string) {
  return requestJson<void>(`/evals/agent-policies/${policyId}`, {
    method: "DELETE",
  })
}

export function activateAgentPolicy(
  policyId: string,
  body: { evalRunId?: string; note?: string } = {},
) {
  return requestJson<AgentPolicyListItem>(`/evals/agent-policies/${policyId}/activate`, {
    method: "POST",
    body,
  })
}

/** 创建异步评测与优化任务，返回 202 + queued Run 摘要。 */
export function createEvalRun(datasetId: string, body: EvalRunCreateBody = {}) {
  return requestJson<EvalRun>(`/evals/datasets/${datasetId}/runs`, {
    method: "POST",
    body,
  })
}

export function getEvalRun(runId: string) {
  return requestJson<EvalRunDetail>(`/evals/runs/${runId}`)
}

export function getEvalRunProgress(runId: string) {
  return requestJson<EvalRunProgress>(`/evals/runs/${runId}/progress`)
}

export function cancelEvalRun(runId: string) {
  return requestJson<EvalRun>(`/evals/runs/${runId}/cancel`, { method: "POST" })
}

export function getEvalRunResult(runId: string, resultId: string) {
  return requestJson<EvalRunResultDetail>(`/evals/runs/${runId}/results/${resultId}`)
}

export function getEvalMetricTrends(
  datasetId: string,
  params: {
    retrieverMode?: string
    topK?: number
    includeGeneration?: boolean
    limit?: number
  } = {},
) {
  return requestJson<EvalMetricTrendResponse>(`/evals/datasets/${datasetId}/metric-trends`, {
    query: {
      retrieverMode: params.retrieverMode,
      topK: params.topK,
      includeGeneration: params.includeGeneration,
      limit: params.limit,
    },
  })
}

export type EvalQueryChangeClassification =
  | "improved"
  | "regressed"
  | "unchanged"
  | "incomparable"

export type EvalRunCompareQuerySide = {
  resultId: string | null
  status: string | null
  metrics: EvalRunMetrics | null
}

export type EvalRunCompareQueryChange = {
  queryId: string
  question: string
  baseline: EvalRunCompareQuerySide
  candidate: EvalRunCompareQuerySide
  classification: EvalQueryChangeClassification
}

export type EvalMetricDeltas = {
  recallAtK: number | null
  precisionAtK: number | null
  hitAtK: number | null
  mrrAtK: number | null
  ndcgAtK: number | null
  latencyMs: number | null
  providerCostProxy: number | null
}

export type EvalBehaviorDeltas = {
  rates: {
    multiPassRate: number | null
    rerankRate: number | null
    contextExpandRate: number | null
    evidenceVerifiedRate: number | null
    evidenceSufficientRate: number | null
    avgToolCallCount: number | null
  }
  baselineModeDistribution: Record<string, number>
  candidateModeDistribution: Record<string, number>
  baselineTopKDistribution: Record<string, number>
  candidateTopKDistribution: Record<string, number>
}

export type EvalRunCompareResponse = {
  baseline: EvalRun
  candidate: EvalRun
  metricDeltas: EvalMetricDeltas
  behaviorDeltas?: EvalBehaviorDeltas | null
  queryChanges: EvalRunCompareQueryChange[]
}

export function compareEvalRuns(baselineRunId: string, candidateRunId: string) {
  return requestJson<EvalRunCompareResponse>("/evals/runs/compare", {
    query: { baselineRunId, candidateRunId },
  })
}
