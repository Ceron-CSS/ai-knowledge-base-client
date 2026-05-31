import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Ban, Bot, CheckCircle2, Clock, MoreHorizontal, Pencil, Rocket, Trash2 } from "lucide-react"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import type { Assistant } from "@/api/assistants"
import { useAssistantList, useDeleteAssistant, usePublishAssistant, useUnpublishAssistant } from "@/features/assistants/queries"
import { useMessage } from "@/hooks/use-message"

function yyyyMmDd(iso: string) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function AssistantListPage() {
  const navigate = useNavigate()
  const { error } = useMessage()
  const assistants = useAssistantList()
  const deleteAssistant = useDeleteAssistant()
  const publishAssistant = usePublishAssistant()
  const unpublishAssistant = useUnpublishAssistant()

  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [deleting, setDeleting] = useState<Assistant | null>(null)
  const [query, setQuery] = useState("")

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
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((a) => a.name.toLowerCase().includes(q))
  }, [items, query])
  const countLabel = useMemo(() => `${filteredItems.length} 个助手`, [filteredItems.length])

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

  function handlePublish(a: Assistant, e: React.MouseEvent) {
    e.stopPropagation()
    setMenuOpenFor(null)
    publishAssistant.mutate({ id: a.id })
  }

  function handleUnpublish(a: Assistant, e: React.MouseEvent) {
    e.stopPropagation()
    setMenuOpenFor(null)
    unpublishAssistant.mutate({ id: a.id })
  }

  function goChat(a: Assistant) {
    if (!a.publishedAt) {
      error("该问答助手尚未发布，发布后才能进入对话", 3000)
      return
    }
    navigate(`/assistants/${a.id}/chat`)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumb items={[{ label: "问答助手" }]} />
          <p className="mt-1 text-sm text-muted-foreground">管理问答助手的配置与发布状态</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <div>{countLabel}</div>
        <div className="flex items-center gap-1.5">
          <input
            className="w-52 rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索助手名称"
          />
          <button
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted/60"
            onClick={() => setQuery("")}
          >
            重置
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => navigate("/assistants/new")}
          >
            创建问答助手
          </button>
        </div>
      </div>

      {assistants.isLoading ? (
        <div className="rounded-lg border bg-background px-4 py-10 text-center text-sm text-muted-foreground">加载中...</div>
      ) : assistants.isError ? (
        <div className="rounded-lg border bg-background px-4 py-10 text-center text-sm text-destructive">加载失败，请检查后端服务</div>
      ) : filteredItems.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((a) => (
            <div
              key={a.id}
              className="rounded-lg border bg-background p-4 text-left shadow-sm transition hover:cursor-pointer hover:bg-muted/30 hover:shadow-md"
              role="button"
              tabIndex={0}
              onClick={() => goChat(a)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") goChat(a)
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
                      navigate(`/assistants/${encodeURIComponent(a.id)}`)
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
                      {a.publishedAt ? (
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleUnpublish(a, e)}
                        >
                          <Ban className="h-4 w-4" />
                          取消发布
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60"
                          onClick={(e) => handlePublish(a, e)}
                        >
                          <Rocket className="h-4 w-4" />
                          发布
                        </button>
                      )}
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
          {items.length ? "没有匹配的问答助手" : "暂无问答助手，先创建一个吧"}
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleting}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        description={deleting ? `将删除问答助手「${deleting.name}」，此操作不可恢复` : undefined}
        errorText={deleteAssistant.isError ? "删除失败，请重试" : null}
        confirming={deleteAssistant.isPending}
      />
    </div>
  )
}
