import { useParams } from "react-router-dom"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { Dialog } from "@/components/ui/dialog"
import { ChatComposer } from "@/features/assistantChat/components/ChatComposer"
import { ChatMessageList } from "@/features/assistantChat/components/ChatMessageList"
import { CitationPopover } from "@/features/assistantChat/components/CitationPopover"
import { ConversationSidebar } from "@/features/assistantChat/components/ConversationSidebar"
import { useAssistantChat } from "@/features/assistantChat/hooks/useAssistantChat"
import { normalizeConversationTitle } from "@/features/assistantChat/lib/conversationTitle"

export function AssistantChatPage() {
  const params = useParams()
  const assistantId = params.id ?? ""

  const chat = useAssistantChat({ assistantId })

  return (
    <div className="flex h-[calc(100svh-3rem)] min-h-[600px] flex-col gap-2">
      <Breadcrumb items={[{ label: "问答助手", href: "/assistants" }, { label: "对话" }]} />
      <div className="flex min-h-0 flex-1 gap-4">
        <ConversationSidebar
          assistantName={chat.assistant.data?.name}
          assistantLoading={chat.assistant.isLoading}
          conversationQuery={chat.conversationQuery}
          onConversationQueryChange={chat.setConversationQuery}
          conversationsLoading={chat.conversations.isLoading && chat.list.length === 0}
          conversationsError={chat.conversations.isError}
          conversationsFetching={chat.conversations.isFetchingNextPage}
          list={chat.list}
          totalCount={chat.conversationTotal}
          hasMore={chat.hasMoreConversations}
          onLoadMore={chat.loadMoreConversations}
          selectedConversationId={chat.selectedConversationId}
          editingConversationId={chat.editingConversationId}
          editingTitle={chat.editingTitle}
          onEditingTitleChange={chat.setEditingTitle}
          createPending={chat.createConversation.isPending}
          onStartNewConversation={() => void chat.startNewConversation()}
          onSelectConversation={chat.selectConversation}
          onStartRename={chat.startRenameConversation}
          onCancelRename={chat.cancelRenameConversation}
          onSubmitRename={(conversationId) => void chat.submitRenameConversation(conversationId)}
          onConfirmDelete={chat.setConfirmDelete}
        />

        <section className="flex min-w-0 flex-1 flex-col rounded-lg border bg-background">
          <div className="border-b p-3">
            <div className="text-sm font-medium">
              {chat.selectedConversation ? normalizeConversationTitle(chat.selectedConversation.title) : "对话"}
            </div>
          </div>

          <ChatMessageList
            messagesLoading={chat.messagesQuery.isLoading}
            messagesError={chat.messagesQuery.isError}
            selectedConversationId={chat.selectedConversationId}
            messages={chat.combinedMessages}
            sending={chat.sending}
            streamError={chat.streamError}
            bottomRef={chat.bottomRef}
            onCitationClick={chat.openCitationPopover}
            onPreviewImage={chat.setPreviewImage}
            onResend={chat.resend}
          />

          <ChatComposer
            input={chat.input}
            onInputChange={chat.setInput}
            pendingFiles={chat.pendingFiles}
            pendingFilePreviews={chat.pendingFilePreviews}
            onPendingFilesChange={chat.setPendingFiles}
            composerExpanded={chat.composerExpanded}
            sending={chat.sending}
            blockedByUnpublished={chat.blockedByUnpublished}
            attachmentInputRef={chat.attachmentInputRef}
            inputRef={chat.inputRef}
            onAdjustComposerHeight={chat.adjustComposerHeight}
            onSend={() => void chat.send()}
            onStop={chat.stopGeneration}
            onPreviewImage={chat.setPreviewImage}
          />
        </section>

        <ConfirmDeleteDialog
          open={!!chat.confirmDelete}
          onCancel={() => chat.setConfirmDelete(null)}
          onConfirm={() => void chat.onDeleteConversation()}
          title="确认删除对话"
          description={
            chat.confirmDelete
              ? `将删除对话「${normalizeConversationTitle(chat.confirmDelete.title)}」，该操作不可恢复`
              : undefined
          }
          errorText={chat.deleteConversation.isError ? "删除失败，请重试" : null}
          confirming={chat.deleteConversation.isPending}
        />
        <Dialog
          open={!!chat.previewImage}
          onOpenChange={(open) => !open && chat.setPreviewImage(null)}
          title={chat.previewImage?.name ?? "图片预览"}
        >
          {chat.previewImage ? (
            <div className="max-h-[75svh] overflow-auto">
              <img
                src={chat.previewImage.url}
                alt={chat.previewImage.name ?? "图片预览"}
                className="mx-auto h-auto max-w-full rounded-md border"
              />
            </div>
          ) : null}
        </Dialog>
        <CitationPopover
          activeCitation={chat.activeCitation}
          onClose={chat.closeCitationPopover}
          openingSource={chat.openingSource}
          loadingFullChunk={chat.loadingFullChunk}
          showingFullChunk={chat.showingFullChunk}
          fullChunkText={chat.fullChunkText}
          feedbackPending={chat.feedbackPending}
          feedbackSubmitted={chat.feedbackSubmitted}
          onOpenSource={() => void chat.openSource()}
          onViewFullChunk={() => void chat.viewFullChunk()}
          onCopy={() => void chat.copyCitation()}
          onFeedbackIrrelevant={() => void chat.feedbackIrrelevant()}
        />
      </div>
    </div>
  )
}
