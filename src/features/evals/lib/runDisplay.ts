import type { EvalRun } from "@/api/evals"
import { evalExecutionModeLabel, evalRetrieverModeLabel } from "@/features/evals/lib/labels"

type AgentPolicySnapshot = {
  name?: unknown
  config?: {
    defaultTopK?: unknown
    defaultRetrieverMode?: unknown
  }
}

type AssistantSnapshot = {
  model?: unknown
}

function readPolicySnapshot(run: EvalRun): AgentPolicySnapshot | null {
  const snapshot = run.configSnapshot?.agentPolicySnapshot
  if (!snapshot || typeof snapshot !== "object") return null
  return snapshot as AgentPolicySnapshot
}

export function evalRunTitle(run: EvalRun) {
  if (run.executionMode === "agent") return "Agent 策略评测"
  if (run.executionMode === "auto") return "当前线上策略评测"
  if (run.executionMode === "workflow") return "Workflow 基线评测"
  if (run.executionMode === "retrieval") {
    return `仅检索评测：${evalRetrieverModeLabel(run.retrieverMode)}`
  }
  return evalExecutionModeLabel(run.executionMode)
}

export function evalRunConfigSummary(run: EvalRun) {
  const policy = readPolicySnapshot(run)
  const policyName = typeof policy?.name === "string" ? policy.name : null
  const policyConfig = policy?.config
  const policyTopK =
    typeof policyConfig?.defaultTopK === "number" ? policyConfig.defaultTopK : run.topK
  const policyRetriever =
    typeof policyConfig?.defaultRetrieverMode === "string"
      ? policyConfig.defaultRetrieverMode
      : run.retrieverMode

  if (run.executionMode === "agent" || run.executionMode === "auto") {
    return [
      policyName ?? "未记录策略名称",
      `${evalRetrieverModeLabel(policyRetriever)} · K=${policyTopK}`,
    ].join(" · ")
  }

  return `${evalRetrieverModeLabel(run.retrieverMode)} · K=${run.topK}`
}

export function evalRunAssistantSummary(run: EvalRun) {
  const snapshotModel = run.configSnapshot?.model
  if (typeof snapshotModel === "string" && snapshotModel) return `模型 ${snapshotModel}`
  const assistant = run.configSnapshot?.assistant
  if (!assistant || typeof assistant !== "object") return null
  const model = (assistant as AssistantSnapshot).model
  return typeof model === "string" && model ? `模型 ${model}` : null
}

export function evalRunSampleSummary(run: EvalRun) {
  const total = run.progressTotal || run.resultCount
  if (!total) return "-"
  if (run.status === "queued" || run.status === "running") {
    return `${run.progressCompleted}/${total} 题`
  }
  return `${total} 题`
}

export function evalRunShortId(run: EvalRun) {
  return run.id.slice(0, 8)
}
