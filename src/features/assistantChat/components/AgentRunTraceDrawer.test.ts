import { describe, expect, it } from "vitest"
import type { AgentRunDetail } from "@/api/agentRuns"
import {
  buildEvalFallbackSteps,
  stepLabel,
} from "@/features/assistantChat/components/AgentRunTraceDrawer"

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

describe("stepLabel", () => {
  it("translates every registered graph node and tool name to a Chinese label", () => {
    // Keep in sync with server graph node names and tool registry names.
    const names = [
      // workflow graph nodes
      "route_query",
      "plan_queries",
      "retrieve",
      "judge_context",
      "prepare_generation",
      // tool-agent graph nodes
      "pre_route",
      "agent_planner",
      "execute_tool",
      "context_grader",
      "generation_guard",
      "prepare_direct_generation",
      "prepare_grounded_generation",
      "build_insufficient_answer",
      "workflow_fallback_exit",
      "generate_answer",
      "verify_citations",
      // tool names
      "analyze_query",
      "search_chunks",
      "search_keyword",
      "search_vector",
      "search_hybrid",
      "rerank_results",
      "expand_context",
      "verify_evidence",
      "get_document_info",
    ]
    for (const name of names) {
      expect(stepLabel(name), name).not.toBe(name)
    }
  })
})
