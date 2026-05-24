import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Ban, Bot, CheckCircle2, Clock, MessageCircle, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import type { Assistant } from "@/api/assistants"
import { useAssistantList, useDeleteAssistant } from "@/features/assistants/queries"

function yyyyMmDd(iso: string) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function AssistantListPage() {
  const navigate = useNavigate()
  const assistants = useAssistantList()
  const deleteAssistant = useDeleteAssistant()

  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [deleting, setDeleting] = useState<Assistant | null>(null)

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!menuOpenFor) return
      const t = e.target as Node | null
      if (t && menuRef.current && menuRef.current.contains(t)) return
      setMenuOpenFor(null)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpenFor(null)
    }
    document.addEventListener("mousedown", onDocMouseDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [menuOpenFor])

  const items = assistants.data ?? []
  const countLabel = useMemo(() => `${items.length} 个助手`, [items.length])

  function startDelete(a: Assistant) {
    setDeleting(a)
    setMenuOpenFor(null)
  }

  function cancelDelete() {
    setDeleting(null)
  }

  async function confirmDelete() {
    if (!deleting) return
    await deleteAssistant.mutateAsync({ id: deleting.id })
    cancelDelete()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">问答助手</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理问答助手的配置与发布状态（对话页面暂不实现）。</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          onClick={() => navigate("/assistants/new")}
        >
          <Plus className="h-4 w-4" />
          创建问答助手
        </button>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>{countLabel}</div>
      </div>

      {assistants.isLoading ? (
        <div className="rounded-lg border bg-background px-4 py-10 text-center text-sm text-muted-foreground">加载中...</div>
      ) : assistants.isError ? (
        <div className="rounded-lg border bg-background px-4 py-10 text-center text-sm text-destructive">加载失败，请检查后端服务。</div>
      ) : items.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((a) => (
            <div
              key={a.id}
              className="rounded-lg border bg-background p-4 text-left shadow-sm transition hover:cursor-pointer hover:bg-muted/30 hover:shadow-md"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/assistants/${a.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") navigate(`/assistants/${a.id}`)
              }}
            >
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full border bg-muted/30">
                  <Bot className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold" title={a.name}>
                    {a.name}
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {a.createdBy} 创建于 {yyyyMmDd(a.createdAt)}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                {!a.publishedAt ? (
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
                      {yyyyMmDd(a.publishedAt)}
                    </span>
                  </div>
                )}

                <div className="relative ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center justify-center rounded-md border px-2.5 py-2 text-sm hover:bg-muted/60"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/assistants/${encodeURIComponent(a.id)}/chat`)
                    }}
                    title="对话"
                    aria-label="对话"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center justify-center rounded-md border px-2.5 py-2 text-sm hover:bg-muted/60"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpenFor((cur) => (cur === a.id ? null : a.id))
                    }}
                    title="菜单"
                    aria-label="菜单"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>

                  {menuOpenFor === a.id ? (
                    <div
                      ref={menuRef}
                      className="absolute right-0 top-full z-10 mt-2 w-36 overflow-hidden rounded-md border bg-background shadow-md"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60"
                        onClick={() => navigate(`/assistants/${a.id}`)}
                      >
                        <Pencil className="h-4 w-4" />
                        编辑
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                        onClick={() => startDelete(a)}
                      >
                        <Trash2 className="h-4 w-4" />
                        删除
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
          暂无问答助手，先创建一个吧。
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleting}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        description={deleting ? `将删除问答助手「${deleting.name}」，此操作不可恢复。` : undefined}
        errorText={deleteAssistant.isError ? "删除失败，请重试。" : null}
        confirming={deleteAssistant.isPending}
      />
    </div>
  )
}
