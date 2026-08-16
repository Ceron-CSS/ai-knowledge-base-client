import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const api = vi.hoisted(() => ({
  listFeishuSources: vi.fn(),
  importFeishuDocs: vi.fn(),
}))
vi.mock("@/api/feishu", () => api)
vi.mock("@/components/ui/message", () => ({
  message: { success: vi.fn(), error: vi.fn() },
}))

import { FeishuDocPicker } from "./FeishuDocPicker"
import { useFeishuDocPicker } from "@/features/feishu/hooks/useFeishuDocPicker"

function Harness({ kbId }: { kbId: string }) {
  const state = useFeishuDocPicker(kbId)
  return <FeishuDocPicker state={state} />
}

function renderHarness(kbId = "kb-1") {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <Harness kbId={kbId} />
    </QueryClientProvider>
  )
}

const driveItems = [
  { id: "dox1", name: "FAQ", type: "docx", kind: "drive", hasChild: false },
  {
    id: "fl1",
    name: "产品文档",
    type: "folder",
    kind: "drive",
    hasChild: false,
  },
  { id: "sheet1", name: "报表", type: "sheet", kind: "drive", hasChild: false },
]

beforeEach(() => {
  vi.clearAllMocks()
  api.listFeishuSources.mockResolvedValue({ items: driveItems })
})

describe("FeishuDocPicker", () => {
  it("auto-loads drive root, allows docx/sheet and counts selection", async () => {
    const user = userEvent.setup()
    renderHarness("kb-1")

    await waitFor(() =>
      expect(screen.getByLabelText("选择 FAQ")).toBeInTheDocument()
    )
    expect(api.listFeishuSources).toHaveBeenCalledWith({
      kind: "drive",
      folderToken: undefined,
    })

    // 表格(sheet)也是可导入类型，勾选框可用。
    expect(screen.getByLabelText("选择 报表")).toBeEnabled()

    await user.click(screen.getByLabelText("选择 FAQ"))
    expect(screen.getByText("已选择 1 篇")).toBeInTheDocument()

    await user.click(screen.getByLabelText("选择 FAQ"))
    expect(screen.getByText("已选择 0 篇")).toBeInTheDocument()
  })

  it("navigates into a folder by token", async () => {
    const user = userEvent.setup()
    renderHarness("kb-1")

    await user.click(await screen.findByText("产品文档"))

    expect(api.listFeishuSources).toHaveBeenCalledWith({
      kind: "drive",
      folderToken: "fl1",
    })
  })

  it("imports selected docs and shows result status", async () => {
    const user = userEvent.setup()
    api.importFeishuDocs.mockResolvedValue({
      results: [
        {
          docToken: "dox1",
          name: "FAQ",
          status: "importing",
          itemId: "item-1",
          errorCode: null,
        },
      ],
    })
    renderHarness("kb-1")

    await user.click(await screen.findByLabelText("选择 FAQ"))
    await user.click(screen.getByText("导入到知识库"))

    await waitFor(() =>
      expect(api.importFeishuDocs).toHaveBeenCalledWith("kb-1", [
        { id: "dox1", name: "FAQ", kind: "drive", type: "docx" },
      ])
    )
    await waitFor(() => expect(screen.getByText("已提交")).toBeInTheDocument())
  })
})
