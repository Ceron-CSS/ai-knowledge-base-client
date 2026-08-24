import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { KbPage } from "@/features/kb/pages/KbPage"

const apiMocks = vi.hoisted(() => ({
  createKb: vi.fn(),
  deleteKb: vi.fn(),
  deleteKbItem: vi.fn(),
  getKb: vi.fn(),
  getKbLinkedAssistants: vi.fn(),
  listAllKbItems: vi.fn(),
  listKbItems: vi.fn(),
  listKbs: vi.fn(),
  retryKbItemExtraction: vi.fn(),
  retryKbItemIndexing: vi.fn(),
  setKbEnabled: vi.fn(),
  setKbItemEnabled: vi.fn(),
  updateKb: vi.fn(),
}))

vi.mock("@/api/kb", () => ({
  createKb: apiMocks.createKb,
  deleteKb: apiMocks.deleteKb,
  deleteKbItem: apiMocks.deleteKbItem,
  getKb: apiMocks.getKb,
  getKbLinkedAssistants: apiMocks.getKbLinkedAssistants,
  listAllKbItems: apiMocks.listAllKbItems,
  listKbItems: apiMocks.listKbItems,
  listKbs: apiMocks.listKbs,
  retryKbItemExtraction: apiMocks.retryKbItemExtraction,
  retryKbItemIndexing: apiMocks.retryKbItemIndexing,
  setKbEnabled: apiMocks.setKbEnabled,
  setKbItemEnabled: apiMocks.setKbItemEnabled,
  updateKb: apiMocks.updateKb,
}))

describe("KbPage", () => {
  it("opens the delete dialog before linked assistants finish loading", async () => {
    apiMocks.listKbs.mockResolvedValue({
      items: [
        {
          id: "kb-1",
          name: "产品知识库",
          description: "售后资料",
          enabled: true,
          docCount: 2,
          charCount: 1200,
          createdAt: "2026-08-21T01:00:00.000Z",
          updatedAt: "2026-08-21T01:00:00.000Z",
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    })
    apiMocks.getKbLinkedAssistants.mockReturnValue(new Promise(() => undefined))

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <KbPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await userEvent.click(await screen.findByRole("button", { name: "删除" }))

    expect(screen.getByText("确认删除知识库")).toBeInTheDocument()
    expect(screen.getByText("正在检查关联助手...")).toBeInTheDocument()
    expect(apiMocks.getKbLinkedAssistants).toHaveBeenCalledWith("kb-1")
  })
})
