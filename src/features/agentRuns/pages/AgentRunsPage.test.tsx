import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { AgentRunsPage } from "@/features/agentRuns/pages/AgentRunsPage"

const apiMocks = vi.hoisted(() => ({
  getAgentRunMetrics: vi.fn(),
  listAgentRuns: vi.fn(),
  listAssistants: vi.fn(),
}))

vi.mock("@/api/agentRuns", () => ({
  getAgentRunMetrics: apiMocks.getAgentRunMetrics,
  listAgentRuns: apiMocks.listAgentRuns,
}))

vi.mock("@/api/assistants", () => ({
  listAssistants: apiMocks.listAssistants,
}))

describe("AgentRunsPage", () => {
  it("lays out the run log table with a wider truncated question and compact status metadata columns", async () => {
    apiMocks.listAssistants.mockResolvedValue([])
    apiMocks.getAgentRunMetrics.mockResolvedValue({
      totalRuns: 1,
      successRate: 1,
      p95TtftMs: 120,
      p95LatencyMs: 900,
      avgToolCallCount: 1,
      plannerFallbackRate: 0,
      insufficientContextRate: 0,
      dailyRuns: [],
    })
    apiMocks.listAgentRuns.mockResolvedValue({
      items: [
        {
          id: "run-123",
          assistantId: "assistant-1",
          assistantName: "知识助手",
          status: "succeeded",
          source: "chat",
          executionMode: "agent",
          model: "gpt-5-mini",
          policy: {
            id: "policy-strict-v3",
            name: "严格检索策略",
            version: "v3",
          },
          question: "这是一个很长的运行日志问题，用于确认问题列会获得更多宽度并在超出时显示省略号。",
          answer: "进入二级页面查看。",
          errorCode: "MODEL_TIMEOUT",
          createdAt: "2026-08-21T01:00:00.000Z",
          summary: {
            latencyMs: 900,
            ttftMs: 120,
            streamingMs: 780,
            toolCallCount: 12,
            retrievedCount: 2,
            usedCitationCount: 1,
            estimatedInputTokens: null,
            estimatedOutputTokens: null,
          },
        },
      ],
      page: 1,
      pageSize: 10,
      total: 1,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/agent-runs"]}>
          <AgentRunsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const question = await screen.findByText(
      "这是一个很长的运行日志问题，用于确认问题列会获得更多宽度并在超出时显示省略号。",
    )
    expect(question).toHaveClass("block", "truncate")
    expect(question).toHaveAttribute("title", question.textContent)
    expect(screen.getByRole("columnheader", { name: "问题" })).toHaveClass("w-[34%]")

    const status = screen.getByLabelText("运行状态：成功")
    expect(status).toHaveClass("whitespace-nowrap")
    expect(status.querySelector("[aria-hidden='true']")).toHaveClass("bg-emerald-500")

    expect(screen.getByRole("columnheader", { name: "来源" })).toHaveClass("w-20")
    expect(screen.getByRole("columnheader", { name: "策略" })).toBeInTheDocument()
    expect(screen.getByText("严格检索策略 · v3")).toHaveAttribute(
      "title",
      "严格检索策略 · v3（policy-strict-v3）",
    )
    expect(screen.getByRole("columnheader", { name: "工具调用" })).toHaveClass("w-20")
    expect(screen.getByRole("columnheader", { name: "错误码" })).toHaveClass("w-24")
  })

  it("loads all run logs by default while keeping metrics scoped to the last 7 days", async () => {
    apiMocks.listAssistants.mockResolvedValue([])
    apiMocks.getAgentRunMetrics.mockResolvedValue({
      totalRuns: 0,
      successRate: 0,
      p95TtftMs: null,
      p95LatencyMs: 900,
      avgToolCallCount: 0,
      plannerFallbackRate: 0,
      insufficientContextRate: 0,
      dailyRuns: [],
    })
    apiMocks.listAgentRuns.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/agent-runs"]}>
          <AgentRunsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(apiMocks.listAgentRuns).toHaveBeenCalledWith(
        expect.not.objectContaining({
          dateFrom: expect.anything(),
          dateTo: expect.anything(),
        }),
      )
      expect(apiMocks.getAgentRunMetrics).toHaveBeenCalledWith({ assistantId: undefined, days: 7 })
    })
    expect(screen.queryByText("900 ms")).not.toBeInTheDocument()
  })

  it("navigates to the run detail page from the table action", async () => {
    apiMocks.listAssistants.mockResolvedValue([])
    apiMocks.getAgentRunMetrics.mockResolvedValue({
      totalRuns: 1,
      successRate: 1,
      p95TtftMs: 120,
      p95LatencyMs: 900,
      avgToolCallCount: 1,
      plannerFallbackRate: 0,
      insufficientContextRate: 0,
      dailyRuns: [],
    })
    apiMocks.listAgentRuns.mockResolvedValue({
      items: [
        {
          id: "run-123",
          assistantId: "assistant-1",
          assistantName: "知识助手",
          status: "succeeded",
          source: "chat",
          executionMode: "agent",
          model: "gpt-5-mini",
          question: "如何查看运行详情？",
          answer: "进入二级页面查看。",
          errorCode: null,
          createdAt: "2026-08-21T01:00:00.000Z",
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
        },
      ],
      page: 1,
      pageSize: 10,
      total: 1,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/agent-runs"]}>
          <Routes>
            <Route path="/agent-runs" element={<AgentRunsPage />} />
            <Route path="/agent-runs/:runId" element={<div>运行详情页面</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText("如何查看运行详情？")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "详情" }))

    expect(screen.getByText("运行详情页面")).toBeInTheDocument()
  })
})
