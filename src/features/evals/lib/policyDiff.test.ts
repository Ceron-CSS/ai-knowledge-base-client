import { describe, expect, it } from "vitest"
import type { AgentPolicyListItem } from "@/api/evals"
import { buildPolicyDiffSummary } from "@/features/evals/lib/policyDiff"

function policy(id: string, config: AgentPolicyListItem["config"]): AgentPolicyListItem {
  return {
    id,
    name: id,
    version: id,
    status: "draft",
    description: "",
    config,
  }
}

describe("buildPolicyDiffSummary", () => {
  it("returns unchanged text when a candidate matches its source", () => {
    const source = policy("source", {
      defaultTopK: 6,
      rerank: { enabled: true, maxCandidates: 30 },
    })
    const candidate = policy("candidate", {
      defaultTopK: 6,
      rerank: { enabled: true, maxCandidates: 30 },
    })

    expect(buildPolicyDiffSummary(candidate, source)).toEqual(["与源策略一致"])
  })

  it("summarizes changed strategy parameters", () => {
    const source = policy("source", {
      defaultExecutionMode: "agent",
      defaultTopK: 6,
      maxToolCalls: 6,
      rerank: { enabled: true, maxCandidates: 30 },
      evidenceVerification: { enabled: true, minConfidence: 0.35 },
    })
    const candidate = policy("candidate", {
      defaultExecutionMode: "auto",
      defaultTopK: 8,
      maxToolCalls: 4,
      rerank: { enabled: true, maxCandidates: 50 },
      evidenceVerification: { enabled: true, minConfidence: 0.45 },
    })

    expect(buildPolicyDiffSummary(candidate, source)).toEqual([
      "执行路径: agent -> auto",
      "默认 TopK: 6 -> 8",
      "最大工具调用次数: 6 -> 4",
      "Rerank 候选数: 30 -> 50",
      "Evidence 最小置信度: 0.35 -> 0.45",
    ])
  })
})
