import { render, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

const messageMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock("@/components/ui/message", () => ({ message: messageMock }))

const hooks = vi.hoisted(() => ({
  useRefetchFeishuStatus: vi.fn(),
}))
vi.mock("@/features/feishu/hooks/useFeishuStatus", () => ({
  useRefetchFeishuStatus: hooks.useRefetchFeishuStatus,
}))

const reopen = vi.hoisted(() => ({
  requestReopenImportDialog: vi.fn(),
}))
vi.mock("@/features/feishu/lib/reopenImportDialog", () => ({
  requestReopenImportDialog: reopen.requestReopenImportDialog,
}))

import { FeishuOAuthBridge } from "./FeishuOAuthBridge"

function setup(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <FeishuOAuthBridge />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  hooks.useRefetchFeishuStatus.mockReturnValue(vi.fn())
  window.history.replaceState(null, "", "/home")
})

describe("FeishuOAuthBridge", () => {
  it("shows success, requests dialog reopen and leaves the param for the page", async () => {
    setup("/home?feishu=connected")

    await waitFor(() =>
      expect(messageMock.success).toHaveBeenCalledWith("飞书账号已连接")
    )
    expect(reopen.requestReopenImportDialog).toHaveBeenCalledTimes(1)
    // 参数由 KB 页面读取后清理，桥接组件不动它。
    expect(window.location.search).toContain("feishu")
  })

  it("shows error with reason and clears the query param", async () => {
    setup("/home?feishu=error&reason=INVALID_STATE")

    await waitFor(() =>
      expect(messageMock.error).toHaveBeenCalledWith(
        "飞书授权失败：INVALID_STATE"
      )
    )
    expect(reopen.requestReopenImportDialog).not.toHaveBeenCalled()
    expect(window.location.search).not.toContain("feishu")
    expect(window.location.search).not.toContain("reason")
  })
})
