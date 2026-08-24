import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { AgentPolicyListItem } from "@/api/evals"
import { AgentPolicyEditDialog } from "@/features/evals/components/AgentPolicyEditDialog"

describe("AgentPolicyEditDialog", () => {
  it("separates runtime guardrails from planner instructions and submits retry budget", async () => {
    const onSubmit = vi.fn()
    render(<AgentPolicyEditDialog open policy={policy()} isSaving={false} onCancel={vi.fn()} onSubmit={onSubmit} />)

    expect(screen.getByText("执行预算与失败处理")).toBeInTheDocument()
    expect(screen.getByText("高级设置：Planner 指令")).toBeInTheDocument()
    expect(screen.getByText(/回答语气与格式由问答助手的回答提示词控制/)).toBeInTheDocument()

    const retryInput = screen.getByRole("spinbutton", {
      name: "工具失败重试次数",
    })
    await userEvent.clear(retryInput)
    await userEvent.type(retryInput, "2")
    await userEvent.click(screen.getByRole("button", { name: "保存草稿" }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ maxToolFailureRetries: 2 }),
      }),
    )
  })
})

function policy(): AgentPolicyListItem {
  return {
    id: "policy-1",
    name: "客服检索策略",
    version: "v1",
    status: "draft",
    description: "客服知识库策略",
    editable: true,
    config: {
      answerContextTopK: 6,
      maxToolCalls: 5,
      maxPlannerCalls: 6,
      maxToolFailureRetries: 1,
      minEvidenceScore: 0.15,
      plannerPrompt: "只能使用允许的检索工具",
    },
  }
}
