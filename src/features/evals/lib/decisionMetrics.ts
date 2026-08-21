import type { EvalRunMetrics, EvalRunResult } from "@/api/evals"

export type DecisionSummary = {
  queryType?: string
  selectedModes?: string[]
  initialTopK?: number
  finalTopK?: number
  retrievalPasses?: number
  rerankUsed?: boolean
  contextExpanded?: boolean
  evidenceVerified?: boolean
  evidenceSufficient?: boolean
  stopReason?: string
  toolCallCount?: number
  effectiveExecutionMode?: string
}

export type DecisionMetrics = {
  sampleCount: number
  modeDistribution: Record<string, number>
  topKDistribution: Record<string, number>
  queryTypeDistribution?: Record<string, number>
  stopReasonDistribution?: Record<string, number>
  multiPassRate: number
  rerankRate: number
  contextExpandRate: number
  evidenceVerifiedRate: number
  evidenceSufficientRate: number
  avgToolCallCount: number | null
}

export type JudgeMetricKey = "faithfulness" | "answerRelevancy" | "citationSupport"

export type BehaviorDeltas = {
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

export function readDecisionSummary(metrics: EvalRunMetrics | null | undefined): DecisionSummary | null {
  const raw = metrics?.decisionSummary
  if (!raw || typeof raw !== "object") return null
  return raw as DecisionSummary
}

export function readDecisionMetrics(metrics: EvalRunMetrics | null | undefined): DecisionMetrics | null {
  const raw = metrics?.decisionMetrics
  if (!raw || typeof raw !== "object") return null
  return raw as DecisionMetrics
}

export function aggregateDecisionMetricsFromResults(results: EvalRunResult[]): DecisionMetrics | null {
  const summaries = results
    .map((row) => readDecisionSummary(row.metrics))
    .filter((item): item is DecisionSummary => Boolean(item))
  if (!summaries.length) return null

  const modeDistribution: Record<string, number> = {}
  const topKDistribution: Record<string, number> = {}
  const queryTypeDistribution: Record<string, number> = {}
  const stopReasonDistribution: Record<string, number> = {}
  let multiPass = 0
  let rerankUsed = 0
  let contextExpanded = 0
  let evidenceVerified = 0
  let evidenceSufficient = 0
  let toolCallTotal = 0
  let toolCallPresent = 0

  for (const summary of summaries) {
    const modes = Array.isArray(summary.selectedModes) ? summary.selectedModes : []
    for (const mode of modes) {
      if (!mode || mode === "rerank") continue
      modeDistribution[mode] = (modeDistribution[mode] ?? 0) + 1
    }
    if (
      summary.rerankUsed ||
      modes.includes("rerank") ||
      modes.some((mode) => mode.endsWith("-rerank"))
    ) {
      rerankUsed += 1
    }
    const topK = summary.finalTopK ?? summary.initialTopK
    if (typeof topK === "number" && topK > 0) {
      const key = String(Math.round(topK))
      topKDistribution[key] = (topKDistribution[key] ?? 0) + 1
    }
    if ((summary.retrievalPasses ?? 0) > 1) multiPass += 1
    if (summary.contextExpanded) contextExpanded += 1
    if (summary.evidenceVerified) evidenceVerified += 1
    if (summary.evidenceSufficient) evidenceSufficient += 1
    if (summary.queryType) {
      queryTypeDistribution[summary.queryType] = (queryTypeDistribution[summary.queryType] ?? 0) + 1
    }
    if (summary.stopReason) {
      stopReasonDistribution[summary.stopReason] =
        (stopReasonDistribution[summary.stopReason] ?? 0) + 1
    }
    if (typeof summary.toolCallCount === "number") {
      toolCallTotal += summary.toolCallCount
      toolCallPresent += 1
    }
  }

  const total = summaries.length
  return {
    sampleCount: total,
    modeDistribution,
    topKDistribution,
    queryTypeDistribution,
    stopReasonDistribution,
    multiPassRate: multiPass / total,
    rerankRate: rerankUsed / total,
    contextExpandRate: contextExpanded / total,
    evidenceVerifiedRate: evidenceVerified / total,
    evidenceSufficientRate: evidenceSufficient / total,
    avgToolCallCount: toolCallPresent ? toolCallTotal / toolCallPresent : null,
  }
}

export function formatRate(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-"
  return `${(value * 100).toFixed(1)}%`
}

export function formatDistribution(
  dist: Record<string, number> | undefined,
  formatKey: (key: string) => string = (key) => key,
) {
  if (!dist || !Object.keys(dist).length) return "-"
  return Object.entries(dist)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => `${formatKey(key)}×${count}`)
    .join(" · ")
}

export function readJudgeAverage(
  metrics: EvalRunMetrics | null | undefined,
  results: EvalRunResult[] | undefined,
  key: JudgeMetricKey,
) {
  const direct = metrics?.[key]
  if (typeof direct === "number" && Number.isFinite(direct)) return direct

  const scores =
    results
      ?.map((row) => {
        const value = row.metrics[key]
        if (!value || typeof value !== "object") return null
        const score = (value as { score?: unknown }).score
        return typeof score === "number" && Number.isFinite(score) ? score : null
      })
      .filter((score): score is number => score !== null) ?? []

  if (!scores.length) return null
  return scores.reduce((sum, score) => sum + score, 0) / scores.length
}

export function formatModes(modes: string[] | undefined) {
  if (!modes?.length) return "-"
  return modes.map(formatDecisionMode).join(" → ")
}

export function formatDecisionMode(mode: string) {
  if (mode === "keyword") return "关键词召回"
  if (mode === "keyword-rerank") return "关键词召回+重排"
  if (mode === "vector") return "向量召回"
  if (mode === "vector-rerank") return "向量召回+重排"
  if (mode === "hybrid") return "混合召回"
  if (mode === "hybrid-rerank") return "混合召回+重排"
  if (mode === "rerank") return "重排"
  return mode
}

export function formatQueryType(type: string) {
  if (type === "exact_lookup") return "精确查找"
  if (type === "semantic_explanation") return "语义解释"
  if (type === "procedural") return "流程步骤"
  if (type === "comparison") return "对比判断"
  if (type === "summarization") return "总结归纳"
  if (type === "unsupported") return "无法回答"
  return type
}

export function formatStopReason(reason: string) {
  if (reason === "evidence_sufficient") return "证据充分"
  if (reason === "workflow_fixed") return "固定流程完成"
  if (reason === "completed") return "完成"
  if (reason === "insufficient_evidence") return "证据不足"
  if (reason === "build_insufficient_answer") return "生成证据不足答复"
  if (reason === "insufficient") return "不足"
  if (reason === "tool_budget_exhausted") return "工具预算用尽"
  if (reason === "max_retrieval_passes") return "达到检索轮次上限"
  return reason
}
