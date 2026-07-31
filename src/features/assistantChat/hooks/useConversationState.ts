import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import type { AssistantConversation } from "@/api/assistantChat"
import {
  useAssistantConversationFeed,
  useCreateAssistantConversation,
  useDeleteAssistantConversation,
  useRenameAssistantConversation,
} from "@/features/assistantChat/hooks/queries"
import { normalizeConversationTitle } from "@/features/assistantChat/lib/conversationTitle"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { message } from "@/components/ui/message"

type UseConversationStateOptions = {
  assistantId: string
  blockedByUnpublished: boolean
}

export function useConversationState({ assistantId, blockedByUnpublished }: UseConversationStateOptions) {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedConversationId = searchParams.get("c") ?? ""

  const [conversationQuery, setConversationQuery] = useState("")
  const debouncedConversationQuery = useDebouncedValue(conversationQuery, 250)
  const [confirmDelete, setConfirmDelete] = useState<AssistantConversation | null>(null)
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")

  const feedParams = useMemo(
    () => ({
      ...(debouncedConversationQuery.trim() ? { q: debouncedConversationQuery.trim() } : {}),
      sortBy: "updatedAt" as const,
      sortDir: "desc" as const,
    }),
    [debouncedConversationQuery],
  )

  const conversations = useAssistantConversationFeed(assistantId, feedParams)
  const createConversation = useCreateAssistantConversation(assistantId)
  const deleteConversation = useDeleteAssistantConversation(assistantId)
  const renameConversation = useRenameAssistantConversation(assistantId)

  const list = useMemo(
    () => conversations.data?.pages.flatMap((page) => page.items) ?? [],
    [conversations.data],
  )
  const total = conversations.data?.pages[0]?.total ?? 0
  const hasMore = !!conversations.hasNextPage
  const allList = list

  const selectedConversation = useMemo(
    () => allList.find((item) => item.id === selectedConversationId) ?? null,
    [allList, selectedConversationId],
  )

  useEffect(() => {
    if (
      !assistantId ||
      conversations.isLoading ||
      createConversation.isPending ||
      selectedConversationId ||
      !allList.length
    ) {
      return
    }

    setSearchParams({ c: allList[0].id }, { replace: true })
  }, [
    assistantId,
    conversations.isLoading,
    createConversation.isPending,
    selectedConversationId,
    allList,
    setSearchParams,
  ])

  function selectConversation(conversationId: string) {
    setSearchParams({ c: conversationId }, { replace: false })
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
    if (selectedConversationId === idToDelete) {
      setSearchParams({}, { replace: true })
    }
  }

  function startRenameConversation(conversation: AssistantConversation) {
    setEditingConversationId(conversation.id)
    setEditingTitle(normalizeConversationTitle(conversation.title))
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

  function loadMoreConversations() {
    if (!hasMore || conversations.isFetchingNextPage) return
    void conversations.fetchNextPage()
  }

  return {
    selectedConversationId,
    setSearchParams,
    conversationQuery,
    setConversationQuery,
    conversations,
    list,
    allList,
    total,
    hasMore,
    loadMoreConversations,
    selectedConversation,
    createConversation,
    deleteConversation,
    confirmDelete,
    setConfirmDelete,
    editingConversationId,
    editingTitle,
    setEditingTitle,
    selectConversation,
    startNewConversation,
    onDeleteConversation,
    startRenameConversation,
    cancelRenameConversation,
    submitRenameConversation,
  }
}
