import { describe, expect, it } from "vitest"
import type { AgentRunDetail } from "@/api/agentRuns"
import { buildEvalFallbackSteps } from "@/features/assistantChat/components/AgentRunTraceDrawer"

describe("buildEvalFallbackSteps", () => {
  it("splits empty agent eval traces into orchestration and generation fallback steps", () => {
    const steps = buildEvalFallbackSteps(
      {
        source: "eval",
        executionMode: "agent",
        status: "succeeded",
        summary: {
          latencyMs: 8000,
          toolCallCount: 0,
          retrievedCount: 0,
          usedCitationCount: 0,
          estimatedOutputTokens: null,
        },
      } as AgentRunDetail,
      [],
    )

    expect(steps.map((step) => step.name)).toEqual(["agent_planner", "generate_answer"])
    expect(steps.every((step) => step.durationMs > 0)).toBe(true)
  })
})
