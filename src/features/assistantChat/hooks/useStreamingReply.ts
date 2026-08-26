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
import {
  applyStreamEventToProcess,
  buildInitialRunProcess,
  type RunProcess,
} from "@/features/assistantChat/lib/runProcess"
import { message } from "@/components/ui/message"
import { queryKeys } from "@/app/queryKeys"

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

function appendMessageIfMissing(
  messages: AssistantMessage[],
  message: AssistantMessage
) {
  const index = messages.findIndex((item) => item.id === message.id)
  if (index !== -1) {
    const next = [...messages]
    next[index] = message
    return next
  }

  const alreadyRendered = messages.some(
    (item) =>
      item.conversationId === message.conversationId &&
      item.role === message.role &&
      item.content === message.content
  )
  return alreadyRendered ? messages : [...messages, message]
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
  const [pendingAssistant, setPendingAssistant] =
    useState<AssistantMessage | null>(null)
  const [activeProcess, setActiveProcess] = useState<RunProcess | null>(null)
  const [completedProcessByMessageId, setCompletedProcessByMessageId] =
    useState<Record<string, RunProcess>>({})

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const activeRunIdRef = useRef<string | null>(null)
  const activeProcessRef = useRef<RunProcess | null>(null)

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
      qc.invalidateQueries({
        queryKey: queryKeys.assistantChat.conversations(assistantId),
      }),
      qc.invalidateQueries({
        queryKey: queryKeys.assistantChat.messages(assistantId, conversationId),
      }),
    ])
  }

  function refreshConversationQueries(conversationId: string) {
    void invalidateConversationQueries(conversationId).catch(() => undefined)
  }

  function commitStreamedMessages(
    conversationId: string,
    userMessage: AssistantMessage | null,
    assistantMessage: AssistantMessage
  ) {
    qc.setQueryData<AssistantMessage[]>(
      queryKeys.assistantChat.messages(assistantId, conversationId),
      (current) => {
        let next = current ?? baseMessages
        if (userMessage) next = appendMessageIfMissing(next, userMessage)
        return appendMessageIfMissing(next, assistantMessage)
      }
    )
    refreshConversationQueries(conversationId)
  }

  function clearPendingMessages() {
    setPendingUser(null)
    setPendingAssistant(null)
  }

  function restoreComposer(savedInput: string, savedFiles: File[]) {
    setInput(savedInput)
    setPendingFiles(savedFiles)
  }

  function setCurrentProcess(nextProcess: RunProcess | null) {
    activeProcessRef.current = nextProcess
    setActiveProcess(nextProcess)
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

    const imageFiles = savedFiles.filter((file) =>
      file.type.startsWith("image/")
    )
    const nonImageFiles = savedFiles.filter(
      (file) => !file.type.startsWith("image/")
    )
    const isVisionModel = (assistantBaseModel?.trim() ?? "").startsWith(
      "qwen-vl-"
    )
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
    setCurrentProcess(null)

    let conversationId = selectedConversationId
    let messageCommitted = false
    let optimisticUserMessage: AssistantMessage | null = null

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
      optimisticUserMessage = {
        id: `temp-user-${Date.now()}`,
        conversationId,
        role: "user",
        content: `${userText}${attachmentSummary}`,
        createdAt: new Date().toISOString(),
      }
      setPendingUser(optimisticUserMessage)
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
        attachments.push(
          await uploadAssistantImageAttachment({
            assistantId,
            conversationId,
            file: imageFile,
          })
        )
      }
      for (const file of nonImageFiles) {
        attachments.push(
          await uploadAssistantFileForExtraction({
            assistantId,
            conversationId,
            file,
          })
        )
      }

      const stream = await streamAssistantReply({
        assistantId,
        conversationId,
        text: userText,
        attachments,
        signal: controller.signal,
      })
      for await (const ev of stream) {
        const nextProcess = applyStreamEventToProcess(
          activeProcessRef.current ?? buildInitialRunProcess(),
          ev
        )
        setCurrentProcess(nextProcess)
        if (ev.type === "run_started") {
          activeRunIdRef.current = ev.runId
        } else if (ev.type === "delta") {
          typewriter.enqueue(ev.delta)
        } else if (ev.type === "error") {
          typewriter.flush()
          typewriter.stop()
          if (ev.saved) {
            if (nextProcess) {
              setCompletedProcessByMessageId((current) => ({
                ...current,
                [ev.saved!.id]: nextProcess as RunProcess,
              }))
            }
            commitStreamedMessages(
              conversationId,
              optimisticUserMessage,
              ev.saved
            )
            clearPendingMessages()
            setCurrentProcess(null)
            setStreamError(null)
          } else {
            restoreComposer(savedInput, savedFiles)
            clearPendingMessages()
            setCurrentProcess(null)
            setStreamError(ev.message || "请求失败")
          }
        } else if (ev.type === "done") {
          typewriter.flush()
          typewriter.stop()
          if (nextProcess) {
            setCompletedProcessByMessageId((current) => ({
              ...current,
              [ev.message.id]: nextProcess as RunProcess,
            }))
          }
          commitStreamedMessages(
            conversationId,
            optimisticUserMessage,
            ev.message
          )
          clearPendingMessages()
          setCurrentProcess(null)
        }
      }
    } catch (error) {
      typewriter.stop()
      if (isAbortError(error)) {
        clearPendingMessages()
        setCurrentProcess(null)
        if (conversationId) await invalidateConversationQueries(conversationId)
      } else {
        if (messageCommitted) restoreComposer(savedInput, savedFiles)
        clearPendingMessages()
        setCurrentProcess(null)
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
    activeProcess,
    completedProcessByMessageId,
    bottomRef,
    send,
    stopGeneration,
    resend,
  }
}
