export function evalRunStatusLabel(status: string) {
  if (status === "queued") return "排队中"
  if (status === "running") return "运行中"
  if (status === "succeeded") return "成功"
  if (status === "partial") return "部分成功"
  if (status === "failed") return "失败"
  if (status === "cancelled") return "已取消"
  return status
}

export function evalExecutionModeLabel(mode: string) {
  if (mode === "retrieval") return "仅检索"
  if (mode === "workflow") return "Workflow baseline"
  if (mode === "agent") return "Agent Policy"
  if (mode === "auto") return "Auto Policy"
  return mode
}

export function evalRetrieverModeLabel(mode: string) {
  if (mode === "hybrid") return "混合"
  if (mode === "hybrid-rerank") return "混合+重排"
  if (mode === "keyword") return "关键词"
  if (mode === "vector") return "向量"
  return mode
}

export function formatMetricNumber(value: unknown, digits = 3) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-"
  return value.toFixed(digits)
}

export function formatLatencyMs(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-"
  if (value < 1000) return `${Math.round(value)} ms`
  return `${(value / 1000).toFixed(1)} 秒`
}

export function isEvalRunActive(status: string) {
  return status === "queued" || status === "running"
}
