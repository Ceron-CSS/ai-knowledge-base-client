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
    if (summary.rerankUsed || modes.includes("rerank") || modes.includes("hybrid-rerank")) {
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

export function formatDistribution(dist: Record<string, number> | undefined) {
  if (!dist || !Object.keys(dist).length) return "-"
  return Object.entries(dist)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => `${key}×${count}`)
    .join(" · ")
}

export function formatModes(modes: string[] | undefined) {
  if (!modes?.length) return "-"
  return modes.join(" → ")
}
