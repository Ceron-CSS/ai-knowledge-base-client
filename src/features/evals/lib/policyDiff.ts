import type { AgentPolicyConfig, AgentPolicyListItem } from "@/api/evals"

type DiffField = {
  label: string
  read: (config: AgentPolicyConfig) => unknown
}

const DIFF_FIELDS: DiffField[] = [
  { label: "回答上下文数量", read: (config) => config.answerContextTopK ?? config.defaultTopK },
  { label: "最大工具调用次数", read: (config) => config.maxToolCalls },
  { label: "最大 Planner 调用次数", read: (config) => config.maxPlannerCalls },
  { label: "工具失败重试次数", read: (config) => config.maxToolFailureRetries },
  {
    label: "最低证据分数",
    read: (config) => config.minEvidenceScore ?? config.evidenceVerification?.minConfidence,
  },
  {
    label: "Planner Prompt",
    read: (config) => config.plannerPromptHash ?? config.plannerPrompt ?? config.promptVersions?.planner,
  },
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
