import { requestJson } from "@/api/http"
import { listQueryToSearchParams, type ListQuery, type PaginatedResult } from "@/api/listQuery"

export type AgentRunSummary = {
  /** 端到端墙钟（含流式输出），次要技术指标 */
  latencyMs: number | null
  /** 发问 → 首个 SSE delta，用户真实干等 */
  ttftMs?: number | null
  /** 首字 → 结束，边生成边看，不算干等 */
  streamingMs?: number | null
  toolCallCount: number
  retrievedCount: number
  usedCitationCount: number
  estimatedInputTokens?: number | null
  estimatedOutputTokens?: number | null
  estimatedCost?: number | null
}

export type AgentRunListItem = {
  id: string
  assistantId: string | null
  conversationId: string | null
  messageId: string | null
  source: string
  executionMode: string
  question: string
  status: string
  provider: string | null
  model: string | null
  summary: AgentRunSummary
  stopReason: string | null
  errorCode: string | null
  errorMessage: string | null
  startedAt: string
  finishedAt: string | null
  createdAt: string
}

export type AgentRunDetail = AgentRunListItem & {
  requestId: string | null
  configSnapshot: Record<string, unknown>
  trace: {
    schemaVersion?: number
    runId?: string
    requestId?: string | null
    steps?: Array<Record<string, unknown>>
    retrievalPasses?: Array<Record<string, unknown>>
    selectedCitations?: Array<Record<string, unknown>>
    summary?: Record<string, unknown>
  }
  citations: {
    retrieved?: Array<Record<string, unknown>>
    used?: Array<Record<string, unknown>>
  }
  traceUnavailable?: boolean
}

export type AgentRunMetrics = {
  totalRuns: number
  successRate: number
  p50TtftMs?: number | null
  p95TtftMs?: number | null
  p50LatencyMs: number | null
  p95LatencyMs: number | null
  avgToolCallCount: number
  plannerFallbackRate: number
  insufficientContextRate: number
  dailyRuns: Array<{ date: string; count: number }>
  estimatedInputTokens: number | null
  estimatedOutputTokens: number | null
  estimatedCost: number | null
}

export type AgentRunListParams = ListQuery & {
  assistantId?: string
  conversationId?: string
  source?: string
  executionMode?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export function listAgentRuns(params: AgentRunListParams = {}) {
  const listParams = listQueryToSearchParams(params)
  return requestJson<PaginatedResult<AgentRunListItem>>("/agent-runs", {
    query: {
      ...listParams,
      assistantId: params.assistantId,
      conversationId: params.conversationId,
      source: params.source,
      executionMode: params.executionMode,
      status: params.status,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    },
  })
}

export function getAgentRun(runId: string) {
  return requestJson<AgentRunDetail>(`/agent-runs/${runId}`)
}

export function cancelAgentRun(runId: string) {
  return requestJson<AgentRunDetail>(`/agent-runs/${runId}/cancel`, {
    method: "POST",
  })
}

export function getAgentRunMetrics(params: { assistantId?: string; days?: number } = {}) {
  return requestJson<AgentRunMetrics>("/agent-runs/metrics", {
    query: {
      assistantId: params.assistantId,
      days: params.days ?? 7,
    },
  })
}
