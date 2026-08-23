import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { AssistantListPage } from "@/features/assistants/pages/AssistantListPage"

const apiMocks = vi.hoisted(() => ({
  deleteAssistant: vi.fn(),
  listAssistants: vi.fn(),
  publishAssistant: vi.fn(),
  unpublishAssistant: vi.fn(),
}))

vi.mock("@/api/assistants", () => ({
  deleteAssistant: apiMocks.deleteAssistant,
  listAssistants: apiMocks.listAssistants,
  publishAssistant: apiMocks.publishAssistant,
  unpublishAssistant: apiMocks.unpublishAssistant,
}))

describe("AssistantListPage", () => {
  it("opens the chat page when clicking a published assistant name", async () => {
    apiMocks.listAssistants.mockResolvedValue([
      {
        id: "assistant-1",
        name: "售后问答助手",
        description: "处理售后问题",
        modelProvider: "openai",
        modelConfigId: "model-config-1",
        baseModel: "gpt-5-mini",
        systemPrompt: null,
        kbIds: ["kb-1"],
        executionMode: "agent",
        createdBy: "user-1",
        createdAt: "2026-08-21T01:00:00.000Z",
        updatedAt: "2026-08-21T01:00:00.000Z",
        publishedAt: "2026-08-21T01:00:00.000Z",
      },
    ])

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/assistants"]}>
          <Routes>
            <Route path="/assistants" element={<AssistantListPage />} />
            <Route path="/assistants/:id" element={<div>配置页面</div>} />
            <Route path="/assistants/:id/chat" element={<div>问答界面</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await userEvent.click(await screen.findByRole("button", { name: "售后问答助手" }))

    expect(screen.getByText("问答界面")).toBeInTheDocument()
    expect(screen.queryByText("配置页面")).not.toBeInTheDocument()
  })
})
