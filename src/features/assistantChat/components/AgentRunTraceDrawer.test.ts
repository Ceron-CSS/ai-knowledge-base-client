import { describe, expect, it } from "vitest"
import type { AgentRunDetail } from "@/api/agentRuns"
import {
  buildEvalFallbackSteps,
  decisionLabel,
  stepToolBadge,
  stepLabel,
  visibleTimelineSteps,
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

describe("timeline display labels", () => {
  it("uses model-decision wording for planner steps", () => {
    expect(stepLabel("agent_planner")).toBe("模型决策")
  })

  it("shows the concrete action used by planner and execute-tool steps in Chinese", () => {
    expect(
      stepToolBadge({
        sequence: 1,
        name: "agent_planner",
        kind: "node",
        decision: "tool_call",
        durationMs: 8,
        outputSummary: { tool: "search_chunks" },
      }),
    ).toBe("决策调用：统一检索")

    expect(
      stepToolBadge({
        sequence: 2,
        name: "execute_tool",
        kind: "node",
        decision: "succeeded",
        durationMs: 20,
        outputSummary: { tool: "rerank_results" },
      }),
    ).toBe("工具：重排结果")
  })

  it("translates known decisions instead of showing trace keys", () => {
    expect(decisionLabel("direct_answer_allowed")).toBe("允许直接回答")
    expect(decisionLabel("tool_call")).toBe("计划调用工具")
    expect(decisionLabel("succeeded")).toBe("执行成功")
  })

  it("hides appended tool-history rows from the main timeline", () => {
    const visible = visibleTimelineSteps([
      { sequence: 1, name: "agent_planner", kind: "node", durationMs: 10 },
      { sequence: 2, name: "execute_tool", kind: "node", durationMs: 20 },
      { sequence: 3, name: "search_chunks", kind: "tool", durationMs: 20 },
    ])

    expect(visible.map((step) => step.sequence)).toEqual([1, 2])
  })

  it("keeps tool rows when they are the only available trace detail", () => {
    const visible = visibleTimelineSteps([
      { sequence: 1, name: "search_chunks", kind: "tool", durationMs: 20 },
    ])

    expect(visible.map((step) => step.name)).toEqual(["search_chunks"])
  })
})
