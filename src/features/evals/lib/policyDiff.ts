import type { AgentPolicyConfig, AgentPolicyListItem } from "@/api/evals"

type DiffField = {
  label: string
  read: (config: AgentPolicyConfig) => unknown
}

const DIFF_FIELDS: DiffField[] = [
  { label: "执行路径", read: (config) => config.defaultExecutionMode },
  { label: "默认检索模式", read: (config) => config.defaultRetrieverMode },
  { label: "允许的检索模式", read: (config) => config.allowedRetrievalModes?.join(", ") },
  { label: "默认 TopK", read: (config) => config.defaultTopK },
  { label: "最大 TopK", read: (config) => config.maxTopK },
  { label: "最大检索轮次", read: (config) => config.maxRetrievalPasses },
  { label: "最大工具调用次数", read: (config) => config.maxToolCalls },
  { label: "最大 Planner 调用次数", read: (config) => config.maxPlannerCalls },
  { label: "启用 rerank", read: (config) => config.rerank?.enabled },
  { label: "Rerank 候选数", read: (config) => config.rerank?.maxCandidates },
  { label: "Rerank 结果数", read: (config) => config.rerank?.maxReranked },
  { label: "启用 context expansion", read: (config) => config.contextExpansion?.enabled },
  { label: "相邻 Chunks 数", read: (config) => config.contextExpansion?.maxNeighborChunks },
  { label: "单文档最大 Chunks 数", read: (config) => config.contextExpansion?.maxChunksPerDocument },
  { label: "启用 evidence verification", read: (config) => config.evidenceVerification?.enabled },
  { label: "Evidence 最小置信度", read: (config) => config.evidenceVerification?.minConfidence },
  { label: "允许无答案", read: (config) => config.evidenceVerification?.allowNoAnswer },
  { label: "Planner Prompt", read: (config) => config.promptVersions?.planner },
  { label: "Answer Prompt", read: (config) => config.promptVersions?.answer },
  { label: "Evidence Prompt", read: (config) => config.promptVersions?.evidence },
]

export function buildPolicyDiffSummary(
  policy: AgentPolicyListItem,
  source?: AgentPolicyListItem | null,
): string[] {
  if (!source) return ["无源策略可用"]

  const sourceConfig = source.config ?? {}
  const policyConfig = policy.config ?? {}
  const changes = DIFF_FIELDS.flatMap((field) => {
    const before = field.read(sourceConfig)
    const after = field.read(policyConfig)
    if (formatValue(before) === formatValue(after)) return []
    return `${field.label}: ${formatValue(before)} -> ${formatValue(after)}`
  })

  return changes.length > 0 ? changes : ["与源策略一致"]
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "-"
  if (typeof value === "boolean") return value ? "启用" : "未启用"
  return String(value)
}
