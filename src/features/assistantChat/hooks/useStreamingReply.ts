import { useEffect, useMemo, useRef, useState } from "react"
import type { SetURLSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import {
  streamAssistantReply,
  uploadAssistantFileForExtraction,
  uploadAssistantImageAttachment,
  type AssistantAttachment,
  type AssistantMessage,
} from "@/api/assistantChat"
import { cancelAgentRun } from "@/api/agentRuns"
import { useTypewriter } from "@/features/assistantChat/hooks/useTypewriter"
import { message } from "@/components/ui/message"

type CreateConversationMutation = {
  mutateAsync: () => Promise<{ id: string }>
}

type UseStreamingReplyOptions = {
  assistantId: string
  assistantBaseModel?: string
  blockedByUnpublished: boolean
  selectedConversationId: string
  setSearchParams: SetURLSearchParams
  createConversation: CreateConversationMutation
  baseMessages: AssistantMessage[]
  input: string
  setInput: (value: string) => void
  pendingFiles: File[]
  setPendingFiles: (files: File[]) => void
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

export function useStreamingReply({
  assistantId,
  assistantBaseModel,
  blockedByUnpublished,
  selectedConversationId,
  setSearchParams,
  createConversation,
  baseMessages,
  input,
  setInput,
  pendingFiles,
  setPendingFiles,
}: UseStreamingReplyOptions) {
  const qc = useQueryClient()
  const [sending, setSending] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [pendingUser, setPendingUser] = useState<AssistantMessage | null>(null)
  const [pendingAssistant, setPendingAssistant] = useState<AssistantMessage | null>(null)

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const activeRunIdRef = useRef<string | null>(null)

  const typewriter = useTypewriter((text) => {
    setPendingAssistant((prev) => (prev ? { ...prev, content: text } : prev))
  })

  const combinedMessages = useMemo(() => {
    const output = [...baseMessages]
    if (pendingUser) {
      const last = output[output.length - 1]
      if (last?.role !== "user") output.push(pendingUser)
    }
    if (pendingAssistant) {
      const last = output[output.length - 1]
      if (last?.role !== "assistant") output.push(pendingAssistant)
    }
    return output
  }, [baseMessages, pendingUser, pendingAssistant])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [combinedMessages.length, pendingAssistant?.content])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  function invalidateConversationQueries(conversationId: string) {
    return Promise.all([
      qc.invalidateQueries({ queryKey: ["assistantChat", assistantId, "conversations"] }),
      qc.invalidateQueries({
        queryKey: ["assistantChat", assistantId, "conversations", conversationId, "messages"],
      }),
    ])
  }

  function clearPendingMessages() {
    setPendingUser(null)
    setPendingAssistant(null)
  }

  function restoreComposer(savedInput: string, savedFiles: File[]) {
    setInput(savedInput)
    setPendingFiles(savedFiles)
  }

  function stopGeneration() {
    const runId = activeRunIdRef.current
    abortRef.current?.abort()
    if (runId) {
      void cancelAgentRun(runId).catch(() => {
        // 取消标记失败不阻断 UI；启动恢复任务会兜底
      })
    }
  }

  function resend() {
    setStreamError(null)
    void send()
  }

  async function send() {
    if (blockedByUnpublished) {
      message.error("该问答助手尚未发布，无法发送消息", 3000)
      return
    }

    const savedInput = input
    const savedFiles = [...pendingFiles]
    const text = savedInput.trim()
    const hasFiles = savedFiles.length > 0
    if (!text && !hasFiles) return
    if (!assistantId) return

    const imageFiles = savedFiles.filter((file) => file.type.startsWith("image/"))
    const nonImageFiles = savedFiles.filter((file) => !file.type.startsWith("image/"))
    const isVisionModel = (assistantBaseModel?.trim() ?? "").startsWith("qwen-vl-")
    if (imageFiles.length && !isVisionModel) {
      message.error("当前模型不支持图片理解，请切换到 qwen-vl-* 模型", 3000)
      return
    }

    setStreamError(null)
    setSending(true)
    typewriter.stop()
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    activeRunIdRef.current = null

    let conversationId = selectedConversationId
    let messageCommitted = false

    try {
      if (!conversationId) {
        const created = await createConversation.mutateAsync()
        conversationId = created.id
        setSearchParams({ c: created.id }, { replace: true })
      }

      const userText = text || "请分析我上传的附件"
      const attachmentSummary = savedFiles.length
        ? `\n\n[已上传附件 ${savedFiles.length} 个：${savedFiles.map((file) => file.name).join("、")}]`
        : ""
      setPendingUser({
        id: `temp-user-${Date.now()}`,
        conversationId,
        role: "user",
        content: `${userText}${attachmentSummary}`,
        createdAt: new Date().toISOString(),
      })
      setPendingAssistant({
        id: `temp-assistant-${Date.now()}`,
        conversationId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      })
      setInput("")
      setPendingFiles([])
      messageCommitted = true
      typewriter.reset()

      const attachments: AssistantAttachment[] = []
      for (const imageFile of imageFiles) {
        attachments.push(await uploadAssistantImageAttachment({ assistantId, conversationId, file: imageFile }))
      }
      for (const file of nonImageFiles) {
        attachments.push(await uploadAssistantFileForExtraction({ assistantId, conversationId, file }))
      }

      const stream = await streamAssistantReply({
        assistantId,
        conversationId,
        text: userText,
        attachments,
        signal: controller.signal,
      })
      for await (const ev of stream) {
        if (ev.type === "run_started") {
          activeRunIdRef.current = ev.runId
        } else if (ev.type === "delta") {
          typewriter.enqueue(ev.delta)
        } else if (ev.type === "error") {
          typewriter.flush()
          typewriter.stop()
          if (ev.saved) {
            clearPendingMessages()
            setStreamError(null)
            await invalidateConversationQueries(conversationId)
          } else {
            restoreComposer(savedInput, savedFiles)
            clearPendingMessages()
            setStreamError(ev.message || "请求失败")
          }
        } else if (ev.type === "done") {
          typewriter.flush()
          typewriter.stop()
          clearPendingMessages()
          await invalidateConversationQueries(conversationId)
        }
      }
    } catch (error) {
      typewriter.stop()
      if (isAbortError(error)) {
        clearPendingMessages()
        if (conversationId) await invalidateConversationQueries(conversationId)
      } else {
        if (messageCommitted) restoreComposer(savedInput, savedFiles)
        clearPendingMessages()
        setStreamError(error instanceof Error ? error.message : "请求失败")
      }
    } finally {
      setSending(false)
      activeRunIdRef.current = null
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  return {
    combinedMessages,
    sending,
    streamError,
    bottomRef,
    send,
    stopGeneration,
    resend,
  }
}
