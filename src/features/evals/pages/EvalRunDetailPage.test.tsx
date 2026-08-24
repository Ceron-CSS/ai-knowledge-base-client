import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { EvalRunDetailPage } from "@/features/evals/pages/EvalRunDetailPage"

vi.mock("@/features/evals/hooks/queries", () => ({
  useCancelEvalRun: () => ({
    isError: false,
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useEvalDataset: () => ({ data: null }),
  useEvalQueries: () => ({ data: [] }),
  useEvalRun: () => ({
    data: null,
    isError: false,
    isLoading: true,
  }),
}))

describe("EvalRunDetailPage", () => {
  it("keeps the breadcrumb header fixed while the detail content scrolls", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/evals/runs/run-123"]}>
          <Routes>
            <Route path="/evals/runs/:runId" element={<EvalRunDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByRole("navigation", { name: "面包屑" })).toBeInTheDocument()

    const page = container.firstElementChild
    expect(page).toHaveClass("h-full", "min-h-0", "overflow-hidden")

    const header = page?.querySelector("header")
    expect(header).toHaveClass("sticky", "top-0", "z-40")

    const body = page?.querySelector(".overflow-y-auto")
    expect(body).toHaveClass("min-h-0", "overflow-y-auto")
  })
})
