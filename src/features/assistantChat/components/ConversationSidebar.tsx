import { Check, MessageCirclePlus, Pencil, Trash2, X } from "lucide-react"
import type { AssistantConversation } from "@/api/assistantChat"
import { Input } from "@/components/ui/input"
import { LoadingText } from "@/components/ui/loading-text"
import { formatChatTime } from "@/features/assistantChat/lib/formatDate"
import { normalizeConversationTitle } from "@/features/assistantChat/lib/conversationTitle"

type ConversationSidebarProps = {
  assistantName?: string
  assistantLoading: boolean
  conversationQuery: string
  onConversationQueryChange: (value: string) => void
  conversationsLoading: boolean
  conversationsError: boolean
  conversationsFetching?: boolean
  list: AssistantConversation[]
  allListCount: number
  totalCount: number
  hasMore: boolean
  onLoadMore: () => void
  selectedConversationId: string
  editingConversationId: string | null
  editingTitle: string
  onEditingTitleChange: (value: string) => void
  createPending: boolean
  onStartNewConversation: () => void
  onSelectConversation: (conversationId: string) => void
  onStartRename: (conversation: AssistantConversation) => void
  onCancelRename: () => void
  onSubmitRename: (conversationId: string) => void
  onConfirmDelete: (conversation: AssistantConversation) => void
}

export function ConversationSidebar({
  assistantName,
  assistantLoading,
  conversationQuery,
  onConversationQueryChange,
  conversationsLoading,
  conversationsError,
  conversationsFetching = false,
  list,
  allListCount,
  totalCount,
  hasMore,
  onLoadMore,
  selectedConversationId,
  editingConversationId,
  editingTitle,
  onEditingTitleChange,
  createPending,
  onStartNewConversation,
  onSelectConversation,
  onStartRename,
  onCancelRename,
  onSubmitRename,
  onConfirmDelete,
}: ConversationSidebarProps) {
  return (
    <aside className="flex w-72 shrink-0 flex-col rounded-lg border bg-background">
      <div className="border-b p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 truncate text-sm font-medium" title={assistantName ?? ""}>
            {assistantLoading ? <LoadingText className="justify-start">加载中</LoadingText> : assistantName ?? "问答助手"}
          </div>
          <button
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted/60"
            onClick={onStartNewConversation}
            disabled={createPending}
            title="新对话"
          >
            <MessageCirclePlus className="h-4 w-4" />
            新对话
          </button>
        </div>
        <div className="mt-2">
          <Input
            clearable
            className="w-full min-w-0"
            value={conversationQuery}
            onChange={(e) => onConversationQueryChange(e.target.value)}
            placeholder="搜索标题"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {conversationsLoading ? (
          <LoadingText className="flex px-2 py-6">加载中</LoadingText>
        ) : conversationsError ? (
          <div className="px-2 py-6 text-center text-sm text-destructive">加载失败：请检查后端服务</div>
        ) : list.length ? (
          <div className="space-y-1">
            {list.map((c) => {
              const active = c.id === selectedConversationId
              return (
                <div
                  key={c.id}
                  className={["group flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm", active ? "bg-muted font-medium" : "hover:bg-muted/60"].join(" ")}
                  onClick={() => editingConversationId !== c.id && onSelectConversation(c.id)}
                >
                  <div className="min-w-0 flex-1">
                    {editingConversationId === c.id ? (
                      <div className="flex w-full min-w-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          className="min-w-0 flex-1 px-2 py-1 text-xs"
                          value={editingTitle}
                          onChange={(e) => onEditingTitleChange(e.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="inline-flex shrink-0 rounded border px-1 py-1 hover:bg-muted/60"
                          onClick={() => void onSubmitRename(c.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex shrink-0 rounded border px-1 py-1 hover:bg-muted/60"
                          onClick={onCancelRename}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <div className="truncate">{normalizeConversationTitle(c.title)}</div>
                        <button
                          type="button"
                          className="inline-flex rounded border px-1 py-1 text-xs opacity-0 transition-opacity hover:bg-muted/60 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            onStartRename(c)
                          }}
                          title="重命名"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="mt-0.5 text-xs text-muted-foreground">{formatChatTime(c.updatedAt)}</div>
                  </div>
                  {editingConversationId !== c.id ? (
                    <button
                      className="hidden rounded-md border px-2 py-1 text-xs text-destructive hover:bg-destructive/10 group-hover:inline-flex"
                      onClick={(e) => {
                        e.stopPropagation()
                        onConfirmDelete(c)
                      }}
                      title="删除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              )
            })}
            {hasMore ? (
              <button
                type="button"
                className="mt-1 w-full rounded-md border px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 disabled:opacity-50"
                onClick={onLoadMore}
                disabled={conversationsFetching}
              >
                {conversationsFetching ? "加载中…" : `加载更多（${list.length}/${totalCount}）`}
              </button>
            ) : null}
          </div>
        ) : allListCount || totalCount ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">无匹配结果</div>
        ) : (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">暂无对话，点击右上角开始</div>
        )}
      </div>
    </aside>
  )
}
