import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { Input } from "@/components/ui/input"
import { LoadingText } from "@/components/ui/loading-text"
import type { Assistant } from "@/api/assistants"
import { AssistantCard } from "@/features/assistants/components/AssistantCard"
import {
  useAssistantList,
  useDeleteAssistant,
  usePublishAssistant,
  useUnpublishAssistant,
} from "@/features/assistants/hooks/queries"
import { message } from "@/components/ui/message"

export function AssistantListPage() {
  const navigate = useNavigate()
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
      message.error("该问答助手尚未发布，发布后才能进入对话", 3000)
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
          <Input
            clearable
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索助手名称"
          />
          <button
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => navigate("/assistants/new")}
          >
            创建问答助手
          </button>
        </div>
      </div>

      {assistants.isLoading ? (
        <div className="flex rounded-lg border bg-background px-4 py-10">
          <LoadingText className="mx-auto">加载中</LoadingText>
        </div>
      ) : assistants.isError ? (
        <div className="rounded-lg border bg-background px-4 py-10 text-center text-sm text-destructive">
          加载失败，请检查后端服务
        </div>
      ) : filteredItems.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((a) => (
            <AssistantCard
              key={a.id}
              assistant={a}
              menuOpen={menuOpenFor === a.id}
              menuRef={menuRef}
              onGoChat={() => goChat(a)}
              onEdit={() => navigate(`/assistants/${encodeURIComponent(a.id)}`)}
              onToggleMenu={() => setMenuOpenFor((cur) => (cur === a.id ? null : a.id))}
              onPublish={(e) => handlePublish(a, e)}
              onUnpublish={(e) => handleUnpublish(a, e)}
              onDelete={() => startDelete(a)}
            />
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
