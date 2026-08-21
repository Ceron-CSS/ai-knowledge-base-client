import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { AgentRunDetailPage } from "@/features/agentRuns/pages/AgentRunDetailPage"

const apiMocks = vi.hoisted(() => ({
  getAgentRun: vi.fn(),
}))

vi.mock("@/api/agentRuns", () => ({
  getAgentRun: apiMocks.getAgentRun,
}))

describe("AgentRunDetailPage", () => {
  it("keeps the breadcrumb header fixed while the detail content scrolls", () => {
    apiMocks.getAgentRun.mockResolvedValue(null)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/agent-runs/run-123"]}>
          <Routes>
            <Route path="/agent-runs/:runId" element={<AgentRunDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByRole("navigation", { name: "面包屑" })).toBeInTheDocument()

    const page = container.firstElementChild
    expect(page).toHaveClass("h-full", "min-h-0", "overflow-hidden")

    const body = page?.querySelector(".overflow-y-auto")
    expect(body).toHaveClass("min-h-0", "overflow-y-auto")
  })
})
