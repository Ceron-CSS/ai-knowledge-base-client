import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import {
  streamAssistantReply,
  uploadAssistantFileForExtraction,
  uploadAssistantImageAttachment,
  type AssistantAttachment,
  type AssistantConversation,
  type AssistantMessage,
} from "@/api/assistantChat"
import { useAssistant } from "@/features/assistants"
import {
  useAssistantConversations,
  useAssistantMessages,
  useCreateAssistantConversation,
  useDeleteAssistantConversation,
  useRenameAssistantConversation,
} from "@/features/assistantChat/hooks/queries"
import { useTypewriter } from "@/features/assistantChat/hooks/useTypewriter"
import { MAX_COMPOSER_HEIGHT, MIN_COMPOSER_HEIGHT } from "@/features/assistantChat/constants/chat"
import { normalizeConversationTitle } from "@/features/assistantChat/lib/conversationTitle"
import type { ActiveCitation, ParsedCitation } from "@/features/assistantChat/types"
import { useDebouncedValue } from "@/lib/useDebouncedValue"
import { message } from "@/components/ui/message"

type UseAssistantChatOptions = {
  assistantId: string
}

export function useAssistantChat({ assistantId }: UseAssistantChatOptions) {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedConversationId = searchParams.get("c") ?? ""
  const qc = useQueryClient()

  const assistant = useAssistant(assistantId, !!assistantId)

  const [conversationQuery, setConversationQuery] = useState("")
  const debouncedConversationQuery = useDebouncedValue(conversationQuery, 250)

  const [input, setInput] = useState("")
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [pendingUser, setPendingUser] = useState<AssistantMessage | null>(null)
  const [pendingAssistant, setPendingAssistant] = useState<AssistantMessage | null>(null)
  const [previewImage, setPreviewImage] = useState<{ url: string; name?: string } | null>(null)
  const [activeCitation, setActiveCitation] = useState<ActiveCitation | null>(null)
  const [composerExpanded, setComposerExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<AssistantConversation | null>(null)
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")

  const attachmentInputRef = useRef<HTMLInputElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const typewriter = useTypewriter((text) => {
    setPendingAssistant((prev) => (prev ? { ...prev, content: text } : prev))
  })

  const conversations = useAssistantConversations(assistantId)
  const createConversation = useCreateAssistantConversation(assistantId)
  const deleteConversation = useDeleteAssistantConversation(assistantId)
  const renameConversation = useRenameAssistantConversation(assistantId)
  const messagesQuery = useAssistantMessages(assistantId, selectedConversationId, !!selectedConversationId)
  const baseMessages = messagesQuery.data ?? []

  const allList = conversations.data ?? []
  const list = useMemo(() => {
    const q = debouncedConversationQuery.trim().toLowerCase()
    if (!q) return allList
    return allList.filter((x) => (x.title ?? "").toLowerCase().includes(q))
  }, [allList, debouncedConversationQuery])

  const selectedConversation = useMemo(
    () => allList.find((x) => x.id === selectedConversationId) ?? null,
    [allList, selectedConversationId],
  )

  const combinedMessages = useMemo(() => {
    const output = [...baseMessages]
    if (pendingUser) output.push(pendingUser)
    if (pendingAssistant) output.push(pendingAssistant)
    return output
  }, [baseMessages, pendingUser, pendingAssistant])

  const pendingFilePreviews = useMemo(
    () =>
      pendingFiles.map((file) => ({
        key: `${file.name}-${file.lastModified}`,
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    [pendingFiles],
  )

  useEffect(() => {
    return () => {
      for (const item of pendingFilePreviews) if (item.url) URL.revokeObjectURL(item.url)
    }
  }, [pendingFilePreviews])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [combinedMessages.length, pendingAssistant?.content])

  useEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return
    adjustComposerHeight(textarea)
  }, [input])

  useEffect(() => {
    if (!assistantId || conversations.isLoading || createConversation.isPending || selectedConversationId || !allList.length) {
      return
    }
    setSearchParams({ c: allList[0].id }, { replace: true })
  }, [assistantId, conversations.isLoading, createConversation.isPending, selectedConversationId, allList, setSearchParams])

  const blockedByUnpublished = !assistant.isLoading && !!assistant.data && !assistant.data.publishedAt

  function adjustComposerHeight(textarea: HTMLTextAreaElement) {
    textarea.style.height = "auto"
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, MIN_COMPOSER_HEIGHT), MAX_COMPOSER_HEIGHT)
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > MAX_COMPOSER_HEIGHT ? "auto" : "hidden"
    setComposerExpanded(nextHeight > MIN_COMPOSER_HEIGHT)
  }

  function selectConversation(conversationId: string) {
    setSearchParams({ c: conversationId }, { replace: false })
  }

  function openCitationPopover(index: number, citations: ParsedCitation[], event: React.MouseEvent<HTMLButtonElement>) {
    const citation = citations[index]
    if (!citation) return
    const rect = event.currentTarget.getBoundingClientRect()
    const width = 520
    const left = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - width - 12))
    const top = Math.min(rect.bottom + 8, Math.max(12, window.innerHeight - 480))
    setActiveCitation({ index, citation, left, top })
  }

  async function startNewConversation() {
    if (blockedByUnpublished) {
      message.error("该问答助手尚未发布，无法新建对话", 3000)
      return
    }
    const created = await createConversation.mutateAsync()
    setSearchParams({ c: created.id }, { replace: false })
  }

  async function onDeleteConversation() {
    if (!confirmDelete) return
    const idToDelete = confirmDelete.id
    setConfirmDelete(null)
    await deleteConversation.mutateAsync({ conversationId: idToDelete })
    if (selectedConversationId === idToDelete) setSearchParams({}, { replace: true })
  }

  function startRenameConversation(c: AssistantConversation) {
    setEditingConversationId(c.id)
    setEditingTitle(normalizeConversationTitle(c.title))
  }

  function cancelRenameConversation() {
    setEditingConversationId(null)
    setEditingTitle("")
  }

  async function submitRenameConversation(conversationId: string) {
    const nextTitle = editingTitle.trim()
    if (!nextTitle) return
    await renameConversation.mutateAsync({ conversationId, title: nextTitle })
    cancelRenameConversation()
  }

  async function send() {
    if (blockedByUnpublished) {
      message.error("该问答助手尚未发布，无法发送消息", 3000)
      return
    }
    const text = input.trim()
    const hasFiles = pendingFiles.length > 0
    if (!text && !hasFiles) return
    if (!assistantId) return

    setStreamError(null)
    setSending(true)
    typewriter.stop()

    const imageFiles = pendingFiles.filter((f) => f.type.startsWith("image/"))
    const nonImageFiles = pendingFiles.filter((f) => !f.type.startsWith("image/"))
    const isVisionModel = (assistant.data?.baseModel?.trim() ?? "").startsWith("qwen-vl-")
    if (imageFiles.length && !isVisionModel) {
      setSending(false)
      message.error("当前模型不支持图片理解，请切换到 qwen-vl-* 模型", 3000)
      return
    }

    let conversationId = selectedConversationId
    if (!conversationId) {
      const created = await createConversation.mutateAsync()
      conversationId = created.id
      setSearchParams({ c: created.id }, { replace: true })
    }

    const userText = text || "请分析我上传的附件"
    const attachmentSummary = pendingFiles.length
      ? `\n\n[已上传附件 ${pendingFiles.length} 个：${pendingFiles.map((f) => f.name).join("、")}]`
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
    typewriter.reset()

    try {
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
        signal: new AbortController().signal,
      })
      for await (const ev of stream) {
        if (ev.type === "delta") {
          typewriter.enqueue(ev.delta)
        } else if (ev.type === "error") {
          typewriter.flush()
          typewriter.stop()
          if (ev.saved) {
            await Promise.all([
              qc.invalidateQueries({ queryKey: ["assistantChat", assistantId, "conversations"] }),
              qc.invalidateQueries({
                queryKey: ["assistantChat", assistantId, "conversations", conversationId, "messages"],
              }),
            ])
            setPendingAssistant(null)
            setPendingUser(null)
            setStreamError(null)
          } else {
            setStreamError(ev.message || "请求失败")
          }
        } else {
          typewriter.flush()
          typewriter.stop()
          await Promise.all([
            qc.invalidateQueries({ queryKey: ["assistantChat", assistantId, "conversations"] }),
            qc.invalidateQueries({
              queryKey: ["assistantChat", assistantId, "conversations", conversationId, "messages"],
            }),
          ])
          setPendingAssistant(null)
          setPendingUser(null)
        }
      }
    } catch (e) {
      typewriter.stop()
      setStreamError(e instanceof Error ? e.message : "请求失败")
    } finally {
      setSending(false)
    }
  }

  return {
    assistant,
    conversationQuery,
    setConversationQuery,
    conversations,
    list,
    allList,
    selectedConversation,
    selectedConversationId,
    createConversation,
    deleteConversation,
    messagesQuery,
    combinedMessages,
    input,
    setInput,
    pendingFiles,
    setPendingFiles,
    pendingFilePreviews,
    sending,
    streamError,
    previewImage,
    setPreviewImage,
    activeCitation,
    setActiveCitation,
    composerExpanded,
    confirmDelete,
    setConfirmDelete,
    editingConversationId,
    editingTitle,
    setEditingTitle,
    attachmentInputRef,
    inputRef,
    bottomRef,
    blockedByUnpublished,
    adjustComposerHeight,
    selectConversation,
    openCitationPopover,
    startNewConversation,
    onDeleteConversation,
    startRenameConversation,
    cancelRenameConversation,
    submitRenameConversation,
    send,
  }
}
