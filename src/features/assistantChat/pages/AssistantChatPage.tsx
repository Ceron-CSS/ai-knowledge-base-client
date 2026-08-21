import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { createEvalQueryFromAssistantMessage, type EvalFeedbackType } from "@/api/evals"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Page, PageBody, PageHeader } from "@/components/ui/page-header"
import { Select } from "@/components/ui/select"
import { AgentRunTraceDrawer } from "@/features/assistantChat/components/AgentRunTraceDrawer"
import { ChatComposer } from "@/features/assistantChat/components/ChatComposer"
import { ChatMessageList } from "@/features/assistantChat/components/ChatMessageList"
import { ConversationSidebar } from "@/features/assistantChat/components/ConversationSidebar"
import { useAssistantChat } from "@/features/assistantChat/hooks/useAssistantChat"
import { normalizeConversationTitle } from "@/features/assistantChat/lib/conversationTitle"
import { evalKeys, useEvalDatasets } from "@/features/evals/hooks/queries"

const feedbackOptions: Array<{ value: EvalFeedbackType; label: string }> = [
  { value: "answer_incorrect", label: "回答不正确" },
  { value: "citation_not_supporting", label: "引用不支持回答" },
  { value: "missing_expected_source", label: "没有找到应该命中的资料" },
  { value: "should_have_abstained", label: "应当拒答但系统给出了答案" },
]

export function AssistantChatPage() {
  const params = useParams()
  const assistantId = params.id ?? ""
  const [traceRunId, setTraceRunId] = useState<string | null>(null)
  const [evalDraftMessageId, setEvalDraftMessageId] = useState<string | null>(null)
  const [targetDatasetId, setTargetDatasetId] = useState("")
  const [feedbackType, setFeedbackType] = useState<EvalFeedbackType>("answer_incorrect")
  const qc = useQueryClient()

  const chat = useAssistantChat({ assistantId })
  const evalDatasets = useEvalDatasets()
  const createEvalDraft = useMutation({
    mutationFn: () => {
      if (!evalDraftMessageId || !targetDatasetId || !chat.selectedConversationId) {
        throw new Error("请选择评测集")
      }
      return createEvalQueryFromAssistantMessage(targetDatasetId, {
        assistantId,
        conversationId: chat.selectedConversationId,
        messageId: evalDraftMessageId,
        feedbackType,
      })
    },
    onSuccess: async (query) => {
      await qc.invalidateQueries({ queryKey: evalKeys.datasets() })
      await qc.invalidateQueries({ queryKey: evalKeys.dataset(query.datasetId) })
      await qc.invalidateQueries({ queryKey: evalKeys.queries(query.datasetId) })
      setEvalDraftMessageId(null)
    },
  })
  const datasetOptions =
    evalDatasets.data?.map((dataset) => ({ value: dataset.id, label: dataset.name })) ?? []

  return (
    <Page fill>
      <PageHeader
        items={[
          { label: "问答助手", href: "/assistants" },
          { label: chat.assistant.data?.name ?? "对话" },
        ]}
      />

      <PageBody className="flex min-h-0 flex-col overflow-hidden pt-4">
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

          <section className="flex min-w-0 flex-1 flex-col rounded-lg border border-border bg-card shadow-sm">
            <div className="border-b p-3">
              <div className="text-sm font-medium">
                {chat.selectedConversation
                  ? normalizeConversationTitle(chat.selectedConversation.title)
                  : "对话"}
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
              onPreviewImage={chat.setPreviewImage}
              onResend={chat.resend}
              onOpenRunTrace={setTraceRunId}
              onCreateEvalQuery={(messageId) => {
                setEvalDraftMessageId(messageId)
                setTargetDatasetId((current) => current || datasetOptions[0]?.value || "")
                createEvalDraft.reset()
              }}
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
          <AgentRunTraceDrawer
            open={!!traceRunId}
            runId={traceRunId}
            onClose={() => setTraceRunId(null)}
          />
          <Dialog
            open={!!evalDraftMessageId}
            onOpenChange={(open) => {
              if (!open) setEvalDraftMessageId(null)
            }}
            title="加入评测集"
            description="从这次线上失败创建 EvalQuery 草稿，稍后补充参考答案和相关 Chunk 标签。"
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">目标评测集</label>
                <Select
                  value={targetDatasetId}
                  onValueChange={setTargetDatasetId}
                  options={datasetOptions}
                  placeholder={evalDatasets.isLoading ? "正在加载评测集" : "选择评测集"}
                  disabled={evalDatasets.isLoading || datasetOptions.length === 0}
                />
                {datasetOptions.length === 0 && !evalDatasets.isLoading ? (
                  <div className="mt-1.5 text-xs text-muted-foreground">
                    还没有评测集，请先到评测与策略中创建数据集。
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">反馈类型</label>
                <Select
                  value={feedbackType}
                  onValueChange={(value) => setFeedbackType(value as EvalFeedbackType)}
                  options={feedbackOptions}
                />
              </div>

              {createEvalDraft.isError ? (
                <div className="text-sm text-destructive">创建草稿失败，请检查评测集和对话消息是否仍存在。</div>
              ) : null}

              <div className="flex justify-end gap-3">
                <Button
                  variant="dialog-cancel"
                  size="dialog"
                  onClick={() => setEvalDraftMessageId(null)}
                  disabled={createEvalDraft.isPending}
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  size="dialog"
                  onClick={() => createEvalDraft.mutate()}
                  disabled={!targetDatasetId}
                  loading={createEvalDraft.isPending}
                >
                  创建草稿
                </Button>
              </div>
            </div>
          </Dialog>
        </div>
      </PageBody>
    </Page>
  )
}
