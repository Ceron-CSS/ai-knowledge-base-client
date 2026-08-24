import type { EvalRunCompareQueryChange } from "@/api/evals"

const QUALITY_METRICS = [
  { key: "recallAtK", label: "Recall" },
  { key: "mrrAtK", label: "MRR" },
  { key: "ndcgAtK", label: "NDCG" },
] as const

export function comparisonClassificationLabel(value: string) {
  if (value === "improved") return "B 较高"
  if (value === "regressed") return "A 较高"
  if (value === "unchanged") return "基本一致"
  if (value === "incomparable") return "无法比较"
  return value
}

export function buildQueryComparisonSummary(change: EvalRunCompareQueryChange) {
  const label = comparisonClassificationLabel(change.classification)
  if (change.classification === "incomparable") {
    return { label, detail: "缺少一侧结果或指标", metric: null, delta: null }
  }

  for (const metric of QUALITY_METRICS) {
    const a = readNumber(change.baseline.metrics?.[metric.key])
    const b = readNumber(change.candidate.metrics?.[metric.key])
    if (a === null || b === null) continue
    const delta = b - a
    if (Math.abs(delta) <= 1e-6) continue
    return {
      label,
      detail: `${metric.label} ${formatSignedMetricDelta(delta)}`,
      metric: metric.key,
      delta,
    }
  }

  return {
    label,
    detail:
      change.classification === "unchanged"
        ? "主要质量指标相同"
        : "质量指标存在差异",
    metric: null,
    delta: null,
  }
}

export function formatSignedMetricDelta(
  value: number | null | undefined,
  digits = 3
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(digits)}`
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}
