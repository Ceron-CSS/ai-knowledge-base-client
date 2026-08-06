import type { RefObject } from "react"
import { Ban, Bot, CheckCircle2, Clock, MoreHorizontal, Pencil, Rocket, Trash2 } from "lucide-react"
import type { Assistant } from "@/api/assistants"
import { formatAssistantDate } from "@/features/assistants/lib/formatDate"

type AssistantCardProps = {
  assistant: Assistant
  menuOpen: boolean
  menuRef: RefObject<HTMLDivElement | null>
  onGoChat: () => void
  onEdit: () => void
  onToggleMenu: () => void
  onPublish: (e: React.MouseEvent) => void
  onUnpublish: (e: React.MouseEvent) => void
  onDelete: () => void
}

export function AssistantCard({
  assistant,
  menuOpen,
  menuRef,
  onGoChat,
  onEdit,
  onToggleMenu,
  onPublish,
  onUnpublish,
  onDelete,
}: AssistantCardProps) {
  return (
    <div
      className="rounded-lg border border-border bg-card p-4 text-left shadow-sm transition hover:cursor-pointer hover:border-primary/30 hover:shadow-md"
      role="button"
      tabIndex={0}
      onClick={onGoChat}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onGoChat()
      }}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full border bg-muted/30">
          <Bot className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold" title={assistant.name}>
            {assistant.name}
          </div>
          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            <div className="truncate">{assistant.createdBy}</div>
            <div className="truncate">创建于 {formatAssistantDate(assistant.createdAt)}</div>
            <div className="truncate">修改于 {formatAssistantDate(assistant.updatedAt)}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        {!assistant.publishedAt ? (
          <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Ban className="h-4 w-4" />
            未发布
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              已发布
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {formatAssistantDate(assistant.publishedAt)}
            </span>
          </div>
        )}

        <div className="relative ml-auto flex items-center gap-2">
          <button
            type="button"
            className="inline-flex cursor-pointer items-center justify-center rounded-md border px-2.5 py-2 text-sm hover:bg-muted/60"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            title="编辑"
            aria-label="编辑"
          >
            <Pencil className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="inline-flex cursor-pointer items-center justify-center rounded-md border px-2.5 py-2 text-sm hover:bg-muted/60"
            onClick={(e) => {
              e.stopPropagation()
              onToggleMenu()
            }}
            title="菜单"
            aria-label="菜单"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen ? (
            <div
              ref={menuRef}
              className="absolute right-0 top-full z-10 mt-2 w-36 overflow-hidden rounded-md border bg-background shadow-md"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60"
                onClick={onEdit}
              >
                <Pencil className="h-4 w-4" />
                编辑
              </button>
              {assistant.publishedAt ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                  onClick={onUnpublish}
                >
                  <Ban className="h-4 w-4" />
                  取消发布
                </button>
              ) : (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60"
                  onClick={onPublish}
                >
                  <Rocket className="h-4 w-4" />
                  发布
                </button>
              )}
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
                删除
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
