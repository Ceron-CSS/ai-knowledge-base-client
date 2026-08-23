import { describe, expect, it } from "vitest"
import type { StreamEvent } from "@/api/assistantChat"
import {
  applyStreamEventToProcess,
  buildInitialRunProcess,
  summarizeCompletedProcess,
} from "@/features/assistantChat/lib/runProcess"

describe("run process stream reducer", () => {
  it("turns streaming events into auditable thinking steps", () => {
    let process = buildInitialRunProcess()
    const events: StreamEvent[] = [
      { type: "run_started", runId: "run-1", requestedExecutionMode: "agent" },
      {
        type: "progress",
        runId: "run-1",
        stage: "route",
        title: "判断问题类型",
        detail:
          "判断这是知识库问题，不是闲聊；需要检索相关文档后再回答。",
      },
      {
        type: "tool_started",
        runId: "run-1",
        toolStep: 1,
        toolCall: { id: "call-1", name: "search_hybrid" },
      },
      {
        type: "tool_finished",
        runId: "run-1",
        toolStep: 1,
        toolCall: { id: "call-1", name: "search_hybrid", durationMs: 125 },
        summary: { query: "useState", fusedCount: 3 },
      },
      { type: "generation_started", runId: "run-1" },
      {
        type: "done",
        runId: "run-1",
        effectiveExecutionMode: "agent",
        message: {
          id: "message-1",
          conversationId: "conversation-1",
          role: "assistant",
          content: "answer",
          createdAt: "2026-08-22T00:00:00.000Z",
        },
      },
    ]

    for (const event of events) {
      process = applyStreamEventToProcess(process, event)
    }

    expect(process.status).toBe("succeeded")
    expect(process.steps.map((step) => step.title)).toEqual([
      "判断执行模式",
      "判断问题类型",
      "调用 search_hybrid",
      "组织回答策略",
    ])
    expect(process.steps[1]).toMatchObject({
      status: "succeeded",
      detail: "判断这是知识库问题，不是闲聊；需要检索相关文档后再回答。",
    })
    expect(process.steps[2]).toMatchObject({
      status: "succeeded",
      detail:
        "选择混合检索：关键词命中 useState，向量检索补充语义相近的用法说明。检索 useState，融合候选 3 条。",
      durationMs: 125,
    })
    expect(summarizeCompletedProcess(process)).toBe(
      "思考过程已完成：判断 2 步，工具 1 步，回答策略 1 步"
    )
  })

  it("explains tool failures with the failed tool and reason", () => {
    let process = buildInitialRunProcess()
    const events: StreamEvent[] = [
      { type: "run_started", runId: "run-1", requestedExecutionMode: "agent" },
      {
        type: "tool_started",
        runId: "run-1",
        toolStep: 1,
        toolCall: { id: "call-1", name: "search_hybrid" },
      },
      {
        type: "tool_finished",
        runId: "run-1",
        toolStep: 1,
        toolCall: { id: "call-1", name: "search_hybrid", durationMs: 20 },
        status: "failed",
        errorCode: "TOOL_FAILED",
        errorMessage: "retrieval offline",
      },
    ]

    for (const event of events) {
      process = applyStreamEventToProcess(process, event)
    }

    expect(process.steps[1]).toMatchObject({
      title: "调用 search_hybrid",
      status: "failed",
      detail:
        "search_hybrid 执行失败：retrieval offline。失败类型：TOOL_FAILED。",
    })
  })
})
