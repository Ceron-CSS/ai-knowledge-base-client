import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AgentRunDetail } from "@/api/agentRuns"
import { AgentRunTraceContent } from "@/features/agentRuns/components/AgentRunTraceContent"
import { openKbItemChunkInNewTab } from "@/features/kb/lib/openKbItemChunk"

vi.mock("@/features/kb/lib/openKbItemChunk", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/kb/lib/openKbItemChunk")>()
  return {
    ...actual,
    openKbItemChunkInNewTab: vi.fn(),
  }
})

const mockedOpenKbItemChunkInNewTab = vi.mocked(openKbItemChunkInNewTab)

describe("AgentRunTraceContent", () => {
  beforeEach(() => {
    mockedOpenKbItemChunkInNewTab.mockClear()
  })

  it("keeps question and answer in drawer content by default but can hide them for chat context", () => {
    const { rerender } = render(
      <MemoryRouter>
        <AgentRunTraceContent runId="run-123" detail={detail()} />
      </MemoryRouter>
    )

    expect(
      screen.getByRole("heading", { name: "回答结果" })
    ).toBeInTheDocument()
    expect(screen.getByText("如何查看运行详情？")).toBeInTheDocument()
    expect(screen.getByText("进入二级页面查看。")).toBeInTheDocument()
    expect(screen.getByText("策略：严格检索策略 · v3")).toHaveAttribute(
      "title",
      "policy-strict-v3",
    )

    rerender(
      <MemoryRouter>
        <AgentRunTraceContent
          runId="run-123"
          detail={detail()}
          showAnswerResult={false}
        />
      </MemoryRouter>
    )

    expect(
      screen.queryByRole("heading", { name: "回答结果" })
    ).not.toBeInTheDocument()
    expect(screen.queryByText("如何查看运行详情？")).not.toBeInTheDocument()
    expect(screen.queryByText("进入二级页面查看。")).not.toBeInTheDocument()
  })

  it("renders citation rows as compact single-line file and chunk labels", () => {
    render(
      <MemoryRouter>
        <AgentRunTraceContent
          runId="run-123"
          detail={{
            ...detail(),
            citations: {
              retrieved: [{ fileName: "rules-of-hooks.md", chunkIndex: 0 }],
              used: [{ fileName: "rules-of-hooks.md", chunkIndex: 0 }],
            },
          }}
          variant="page"
        />
      </MemoryRouter>
    )

    const citationLabels = screen.getAllByText("rules-of-hooks.md #1")
    expect(citationLabels).toHaveLength(2)
    expect(
      citationLabels.every(
        (label) => label.getAttribute("title") === "rules-of-hooks.md #1"
      )
    ).toBe(true)
  })

  it("renders retrieval passes in a compact multi-column grid", () => {
    render(
      <MemoryRouter>
        <AgentRunTraceContent
          runId="run-123"
          detail={{
            ...detail(),
            trace: {
              ...detail().trace,
              retrievalPasses: [
                {
                  query: "hooks",
                  durationMs: 120,
                  vectorCount: 2,
                  keywordCount: 1,
                  fusedCount: 3,
                },
                {
                  query: "effects",
                  durationMs: 180,
                  vectorCount: 4,
                  keywordCount: 2,
                  fusedCount: 5,
                },
              ],
            },
          }}
          variant="page"
        />
      </MemoryRouter>
    )

    expect(screen.getByTestId("agent-run-retrieval-passes")).toHaveClass(
      "md:grid-cols-2",
      "2xl:grid-cols-3"
    )
    expect(screen.getByText("Pass 1")).toBeInTheDocument()
    expect(screen.getByText("hooks")).toBeInTheDocument()
    expect(screen.getByText("向量检索 2 条")).toBeInTheDocument()
    expect(screen.getByText("关键词检索 1 条")).toBeInTheDocument()
    expect(screen.queryByText("融合结果 3")).not.toBeInTheDocument()
    expect(screen.getAllByText("RRF 最高分 -")).toHaveLength(2)
  })

  it("renders retrieval passes as one item per row in drawer content", () => {
    render(
      <MemoryRouter>
        <AgentRunTraceContent
          runId="run-123"
          detail={{
            ...detail(),
            trace: {
              ...detail().trace,
              retrievalPasses: [
                {
                  query: "hooks",
                  durationMs: 120,
                  vectorCount: 2,
                  keywordCount: 1,
                },
                {
                  query: "effects",
                  durationMs: 180,
                  vectorCount: 4,
                  keywordCount: 2,
                },
              ],
            },
          }}
        />
      </MemoryRouter>
    )

    expect(screen.getByTestId("agent-run-retrieval-passes")).toHaveClass(
      "grid-cols-1"
    )
    expect(screen.getByTestId("agent-run-retrieval-passes")).not.toHaveClass(
      "md:grid-cols-2",
      "2xl:grid-cols-3"
    )
  })

  it("uses the detail page layout without duplicated summary or mode cards", () => {
    render(
      <MemoryRouter>
        <AgentRunTraceContent
          runId="run-123"
          detail={detail()}
          variant="page"
        />
      </MemoryRouter>
    )

    expect(screen.queryByText("摘要")).not.toBeInTheDocument()
    expect(screen.queryByText("模式")).not.toBeInTheDocument()

    expect(screen.getByTestId("agent-run-detail-layout")).toHaveClass(
      "xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
    )

    const mainRail = screen.getByTestId("agent-run-detail-main-rail")
    expect(
      within(mainRail)
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent)
    ).toEqual(["思考过程", "步骤耗时（技术）", "执行时间线"])

    const sideRail = screen.getByTestId("agent-run-detail-side-rail")
    const headings = within(sideRail)
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent)

    expect(headings).toEqual(["检索详情", "引用结果", "问题", "回答结果"])
  })

  it("renders answer content as markdown", () => {
    render(
      <MemoryRouter>
        <AgentRunTraceContent
          runId="run-123"
          detail={{
            ...detail(),
            answer:
              "请查看 **Rules of Hooks** 和 [React 文档](https://react.dev)。",
          }}
          variant="page"
        />
      </MemoryRouter>
    )

    expect(screen.getByText("Rules of Hooks").tagName).toBe("STRONG")
    expect(screen.getByRole("link", { name: "React 文档" })).toHaveAttribute(
      "href",
      "https://react.dev"
    )
  })

  it("opens the cited source when an answer citation marker is clicked", () => {
    render(
      <MemoryRouter>
        <AgentRunTraceContent
          runId="run-123"
          detail={{
            ...detail(),
            answer: "See citation [1]",
            citations: {
              retrieved: [],
              used: [
                {
                  kbId: "kb-1",
                  itemId: "item-1",
                  chunkIndex: 2,
                  chunkId: "chunk-1",
                  pageStart: 5,
                  fileName: "rules.md",
                },
              ],
            },
          }}
          variant="page"
        />
      </MemoryRouter>
    )

    expect(screen.getAllByText("rules.md #3").length).toBeGreaterThan(1)
    const citationButton = screen.getByRole("button", { name: "1" })
    expect(citationButton).toHaveTextContent("1")

    fireEvent.click(citationButton)

    expect(mockedOpenKbItemChunkInNewTab).toHaveBeenCalledTimes(1)
    expect(mockedOpenKbItemChunkInNewTab).toHaveBeenCalledWith({
      kbId: "kb-1",
      itemId: "item-1",
      chunkIndex: 2,
      chunkId: "chunk-1",
      pageStart: 5,
      fileName: "rules.md",
    })
  })

  it("opens citation result rows in a new tab", () => {
    render(
      <MemoryRouter>
        <AgentRunTraceContent
          runId="run-123"
          detail={{
            ...detail(),
            citations: {
              retrieved: [],
              used: [
                {
                  kbId: "kb-1",
                  itemId: "item-1",
                  chunkIndex: 0,
                  chunkId: "chunk-1",
                  pageStart: 3,
                  fileName: "rules.md",
                },
              ],
            },
          }}
          variant="page"
        />
      </MemoryRouter>
    )

    const row = screen.getAllByText("rules.md #1")[0].closest("div")
    expect(row).not.toBeNull()
    fireEvent.click(within(row!).getByRole("button"))

    expect(mockedOpenKbItemChunkInNewTab).toHaveBeenCalledWith({
      kbId: "kb-1",
      itemId: "item-1",
      chunkIndex: 0,
      chunkId: "chunk-1",
      pageStart: 3,
      fileName: "rules.md",
    })
  })

  it("renders decision-oriented thinking details for trace steps", () => {
    render(
      <MemoryRouter>
        <AgentRunTraceContent
          runId="run-123"
          detail={{
            ...detail(),
            trace: {
              ...detail().trace,
              steps: [
                {
                  sequence: 1,
                  name: "agent_planner",
                  kind: "node",
                  decision: "tool_call",
                  durationMs: 80,
                  outputSummary: {
                    reason: "当前问题不是闲聊，需要知识库证据",
                    tool: "search_hybrid",
                  },
                },
                {
                  sequence: 2,
                  name: "search_hybrid",
                  kind: "tool",
                  status: "succeeded",
                  durationMs: 120,
                  inputSummary: { arguments: { query: "useState" } },
                  outputSummary: { resultSummary: { fusedCount: 3 } },
                },
                {
                  sequence: 3,
                  name: "verify_evidence",
                  kind: "tool",
                  status: "failed",
                  durationMs: 20,
                  outputSummary: {
                    errorCode: "TOOL_FAILED",
                    errorMessage: "retrieval offline",
                  },
                },
              ],
            },
          }}
          variant="page"
        />
      </MemoryRouter>
    )

    const process = screen.getByTestId("agent-run-process")
    expect(within(process).getByText("决定调用 search_hybrid")).toBeInTheDocument()
    expect(
      within(process).getByText(
        "这是知识库问题，不是闲聊；当前证据不足，需要调用 search_hybrid。原因：当前问题不是闲聊，需要知识库证据。"
      )
    ).toBeInTheDocument()
    expect(within(process).getByText("调用 search_hybrid")).toBeInTheDocument()
    expect(
      within(process).getByText(
        "使用查询 useState 检索知识库。命中候选 3 条。"
      )
    ).toBeInTheDocument()
    expect(within(process).getByText("调用 verify_evidence")).toBeInTheDocument()
    expect(
      within(process).getByText(
        "verify_evidence 执行失败：retrieval offline。失败类型：TOOL_FAILED。"
      )
    ).toBeInTheDocument()
  })
})

function detail(): AgentRunDetail {
  return {
    id: "run-123",
    assistantId: "assistant-1",
    conversationId: null,
    messageId: null,
    source: "chat",
    executionMode: "agent",
    question: "如何查看运行详情？",
    status: "succeeded",
    provider: null,
    model: "gpt-5-mini",
    policy: {
      id: "policy-strict-v3",
      name: "严格检索策略",
      version: "v3",
    },
    summary: {
      latencyMs: 900,
      ttftMs: 120,
      streamingMs: 780,
      toolCallCount: 1,
      retrievedCount: 2,
      usedCitationCount: 1,
      estimatedInputTokens: null,
      estimatedOutputTokens: null,
    },
    stopReason: null,
    errorCode: null,
    errorMessage: null,
    startedAt: "2026-08-21T01:00:00.000Z",
    finishedAt: "2026-08-21T01:00:01.000Z",
    createdAt: "2026-08-21T01:00:00.000Z",
    requestId: null,
    answer: "进入二级页面查看。",
    configSnapshot: {},
    trace: {
      steps: [
        {
          sequence: 1,
          name: "retrieve",
          kind: "retrieval",
          durationMs: 200,
        },
        {
          sequence: 2,
          name: "generate_answer",
          kind: "node",
          durationMs: 700,
        },
      ],
      retrievalPasses: [
        {
          query: "运行详情",
          durationMs: 200,
          vectorCount: 1,
          keywordCount: 1,
          fusedCount: 1,
        },
      ],
    },
    citations: {
      retrieved: [],
      used: [],
    },
  }
}
