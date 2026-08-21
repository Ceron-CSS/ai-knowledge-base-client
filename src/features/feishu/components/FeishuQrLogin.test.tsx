import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const api = vi.hoisted(() => ({
  createFeishuAuthorize: vi.fn(),
}))
vi.mock("@/api/feishu", () => api)

const sdk = vi.hoisted(() => ({
  loadFeishuQrSdk: vi.fn(),
}))
vi.mock("@/features/feishu/lib/feishuQrSdk", () => sdk)

import { FeishuQrLogin } from "./FeishuQrLogin"

beforeEach(() => {
  vi.clearAllMocks()
  api.createFeishuAuthorize.mockResolvedValue({
    authorizeUrl: "https://passport.feishu.cn/suite/passport/oauth/authorize?foo=bar",
    state: "state-1",
  })
})

describe("FeishuQrLogin", () => {
  it("shows a fallback button when the QR SDK cannot be loaded", async () => {
    sdk.loadFeishuQrSdk.mockRejectedValue(new Error("Feishu QR SDK failed to load"))

    render(<FeishuQrLogin />)

    await waitFor(() =>
      expect(screen.getByText("Feishu QR SDK failed to load")).toBeInTheDocument()
    )
    expect(
      screen.getByRole("button", { name: "Open Feishu authorization page" })
    ).toBeInTheDocument()
  })
})
