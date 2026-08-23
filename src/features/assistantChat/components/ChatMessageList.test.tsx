import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ChatMessageList } from "@/features/assistantChat/components/ChatMessageList"
import type { RunProcess } from "@/features/assistantChat/lib/runProcess"

describe("ChatMessageList process display", () => {
  it("shows live thinking while streaming and collapses completed thinking on the saved answer", () => {
    const activeProcess: RunProcess = {
      runId: "run-live",
      status: "running",
      steps: [
        {
          id: "run",
          title: "判断执行模式",
          status: "succeeded",
          detail: "用户问题进入智能代理模式，需要先判断是否检索知识库。",
        },
        {
          id: "tool:search_hybrid:1",
          title: "调用 search_hybrid",
          status: "running",
          detail:
            "选择混合检索：关键词命中 useState，向量检索补充语义相近的用法说明。",
        },
      ],
    }
    const completedProcess: RunProcess = {
      runId: "run-done",
      status: "succeeded",
      steps: [
        { id: "run", title: "判断执行模式", status: "succeeded" },
        { id: "generate", title: "组织回答策略", status: "succeeded" },
      ],
    }

    const { rerender } = render(
      <ChatMessageList
        messagesLoading={false}
        messagesError={false}
        selectedConversationId="conversation-1"
        messages={[
          {
            id: "temp-assistant",
            conversationId: "conversation-1",
            role: "assistant",
            content: "",
            createdAt: "2026-08-22T00:00:00.000Z",
          },
        ]}
        sending
        streamError={null}
        bottomRef={{ current: null }}
        onPreviewImage={() => undefined}
        activeProcess={activeProcess}
        completedProcessByMessageId={{}}
      />
    )

    const livePanel = screen.getByTestId("chat-active-process")
    expect(within(livePanel).getByText("思考过程")).toBeInTheDocument()
    expect(within(livePanel).getByText("调用 search_hybrid")).toBeInTheDocument()
    expect(
      within(livePanel).getByText(
        "选择混合检索：关键词命中 useState，向量检索补充语义相近的用法说明。"
      )
    ).toBeInTheDocument()

    rerender(
      <ChatMessageList
        messagesLoading={false}
        messagesError={false}
        selectedConversationId="conversation-1"
        messages={[
          {
            id: "message-1",
            conversationId: "conversation-1",
            role: "assistant",
            content: "answer",
            runId: "run-done",
            createdAt: "2026-08-22T00:00:01.000Z",
          },
        ]}
        sending={false}
        streamError={null}
        bottomRef={{ current: null }}
        onPreviewImage={() => undefined}
        activeProcess={null}
        completedProcessByMessageId={{ "message-1": completedProcess }}
      />
    )

    const completedPanel = screen.getByTestId("chat-completed-process")
    expect(
      within(completedPanel).getByText(
        "思考过程已完成：判断 1 步，回答策略 1 步"
      )
    ).toBeInTheDocument()
    expect(
      within(completedPanel).queryByText("组织回答策略")
    ).not.toBeInTheDocument()
  })
})
