import { useMemo, useState } from "react"
import { useAssistant } from "@/features/assistants"
import { useAttachmentPreviews } from "@/features/assistantChat/hooks/useAttachmentPreviews"
import { useChatComposer } from "@/features/assistantChat/hooks/useChatComposer"
import { useCitationPopover } from "@/features/assistantChat/hooks/useCitationPopover"
import { useConversationState } from "@/features/assistantChat/hooks/useConversationState"
import { useAssistantMessages } from "@/features/assistantChat/hooks/queries"
import { useStreamingReply } from "@/features/assistantChat/hooks/useStreamingReply"

type UseAssistantChatOptions = {
  assistantId: string
}

export function useAssistantChat({ assistantId }: UseAssistantChatOptions) {
  const [previewImage, setPreviewImage] = useState<{ url: string; name?: string } | null>(null)

  const assistant = useAssistant(assistantId, !!assistantId)
  const blockedByUnpublished = !assistant.isLoading && !!assistant.data && !assistant.data.publishedAt

  const conversation = useConversationState({ assistantId, blockedByUnpublished })
  const composer = useChatComposer()
  const attachments = useAttachmentPreviews()
  const citation = useCitationPopover()

  const messagesQuery = useAssistantMessages(
    assistantId,
    conversation.selectedConversationId,
    !!conversation.selectedConversationId,
  )
  const baseMessages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data])

  const streaming = useStreamingReply({
    assistantId,
    assistantBaseModel: assistant.data?.baseModel ?? undefined,
    blockedByUnpublished,
    selectedConversationId: conversation.selectedConversationId,
    setSearchParams: conversation.setSearchParams,
    createConversation: conversation.createConversation,
    baseMessages,
    input: composer.input,
    setInput: composer.setInput,
    pendingFiles: attachments.pendingFiles,
    setPendingFiles: attachments.setPendingFiles,
  })

  return {
    assistant,
    conversationQuery: conversation.conversationQuery,
    setConversationQuery: conversation.setConversationQuery,
    conversations: conversation.conversations,
    list: conversation.list,
    allList: conversation.allList,
    selectedConversation: conversation.selectedConversation,
    selectedConversationId: conversation.selectedConversationId,
    createConversation: conversation.createConversation,
    deleteConversation: conversation.deleteConversation,
    messagesQuery,
    combinedMessages: streaming.combinedMessages,
    input: composer.input,
    setInput: composer.setInput,
    pendingFiles: attachments.pendingFiles,
    setPendingFiles: attachments.setPendingFiles,
    pendingFilePreviews: attachments.pendingFilePreviews,
    sending: streaming.sending,
    streamError: streaming.streamError,
    previewImage,
    setPreviewImage,
    activeCitation: citation.activeCitation,
    setActiveCitation: citation.setActiveCitation,
    composerExpanded: composer.composerExpanded,
    confirmDelete: conversation.confirmDelete,
    setConfirmDelete: conversation.setConfirmDelete,
    editingConversationId: conversation.editingConversationId,
    editingTitle: conversation.editingTitle,
    setEditingTitle: conversation.setEditingTitle,
    attachmentInputRef: composer.attachmentInputRef,
    inputRef: composer.inputRef,
    bottomRef: streaming.bottomRef,
    blockedByUnpublished,
    adjustComposerHeight: composer.adjustComposerHeight,
    selectConversation: conversation.selectConversation,
    openCitationPopover: citation.openCitationPopover,
    startNewConversation: conversation.startNewConversation,
    onDeleteConversation: conversation.onDeleteConversation,
    startRenameConversation: conversation.startRenameConversation,
    cancelRenameConversation: conversation.cancelRenameConversation,
    submitRenameConversation: conversation.submitRenameConversation,
    send: streaming.send,
    stopGeneration: streaming.stopGeneration,
    resend: streaming.resend,
  }
}
