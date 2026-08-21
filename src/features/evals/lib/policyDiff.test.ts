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
      answerContextTopK: 6,
      maxToolCalls: 3,
      maxPlannerCalls: 4,
      minEvidenceScore: 0.15,
      plannerPromptHash: "abc",
    })
    const candidate = policy("candidate", {
      answerContextTopK: 6,
      maxToolCalls: 3,
      maxPlannerCalls: 4,
      minEvidenceScore: 0.15,
      plannerPromptHash: "abc",
    })

    expect(buildPolicyDiffSummary(candidate, source)).toEqual(["与源策略一致"])
  })

  it("summarizes only effective policy fields", () => {
    const source = policy("source", {
      answerContextTopK: 6,
      maxToolCalls: 3,
      maxPlannerCalls: 4,
      minEvidenceScore: 0.15,
      plannerPromptHash: "abc",
      defaultExecutionMode: "agent",
      rerank: { enabled: true, maxCandidates: 30 },
    })
    const candidate = policy("candidate", {
      answerContextTopK: 8,
      maxToolCalls: 2,
      maxPlannerCalls: 5,
      minEvidenceScore: 0.35,
      plannerPromptHash: "def",
      defaultExecutionMode: "auto",
      rerank: { enabled: false, maxCandidates: 50 },
    })

    expect(buildPolicyDiffSummary(candidate, source)).toEqual([
      "回答上下文数量: 6 -> 8",
      "最大工具调用次数: 3 -> 2",
      "最大 Planner 调用次数: 4 -> 5",
      "最低证据分数: 0.15 -> 0.35",
      "Planner Prompt: abc -> def",
    ])
  })
})
