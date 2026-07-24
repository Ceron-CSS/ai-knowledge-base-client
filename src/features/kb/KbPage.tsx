import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowUpDown, FolderOpen, Pencil, Trash2 } from "lucide-react"
import type { Kb, KbLinkedAssistant, KbSortBy, SortDir } from "@/api/kb"
import { getKbLinkedAssistants } from "@/api/kb"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { Dialog } from "@/components/ui/dialog"
import { DialogActions } from "@/components/ui/dialog-actions"
import { Switch } from "@/components/ui/switch"
import { useCreateKb, useDeleteKb, useKbList, useSetKbEnabled, useUpdateKb } from "@/features/kb/queries"
import { useDebouncedValue } from "@/lib/useDebouncedValue"

type EditingState = { mode: "create" } | { mode: "edit"; kb: Kb } | { mode: "none" }

const KB_SORT_KEY = "kb.listSort"

function formatCharCountK(value: number) {
  if (value <= 0) return "0K"
  return `${(value / 1000).toFixed(value >= 1000 ? 1 : 2)}K`
}

function parseKbSort(raw: string | null): { sortBy: KbSortBy; sortDir: SortDir } {
  if (!raw) return { sortBy: "createdAt", sortDir: "desc" }
  const parts = raw.split(":")
  const sortBy = parts[0] as KbSortBy
  const sortDir = parts[1] as SortDir
  const sortByOk = sortBy === "updatedAt" || sortBy === "createdAt" || sortBy === "name"
  const sortDirOk = sortDir === "asc" || sortDir === "desc"
  if (!sortByOk || !sortDirOk) return { sortBy: "createdAt", sortDir: "desc" }
  return { sortBy, sortDir }
}

export function KbPage() {
  const navigate = useNavigate()

  const [sort, setSort] = useState<{ sortBy: KbSortBy; sortDir: SortDir }>(() => {
    try {
      return parseKbSort(localStorage.getItem(KB_SORT_KEY))
    } catch {
      return { sortBy: "createdAt", sortDir: "desc" }
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(KB_SORT_KEY, `${sort.sortBy}:${sort.sortDir}`)
    } catch {
      // ignore localStorage failures
    }
  }, [sort.sortBy, sort.sortDir])

  const kbList = useKbList(sort)
  const createKb = useCreateKb()
  const updateKb = useUpdateKb()
  const setEnabled = useSetKbEnabled()
  const deleteKb = useDeleteKb()

  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query, 250)
  const [editing, setEditing] = useState<EditingState>({ mode: "none" })
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [deleting, setDeleting] = useState<Kb | null>(null)
  const [deletingLinked, setDeletingLinked] = useState<KbLinkedAssistant[]>([])
  const [disablingKb, setDisablingKb] = useState<{ kb: Kb; linked: KbLinkedAssistant[] } | null>(null)
  const [checkingLinked, setCheckingLinked] = useState(false)

  const isSaving = createKb.isPending || updateKb.isPending

  const submitLabel = useMemo(() => {
    if (editing.mode === "create") return "创建"
    if (editing.mode === "edit") return "保存"
    return "提交"
  }, [editing.mode])

  function startCreate() {
    setEditing({ mode: "create" })
    setName("")
    setDescription("")
  }

  function startEdit(kb: Kb) {
    setEditing({ mode: "edit", kb })
    setName(kb.name)
    setDescription(kb.description ?? "")
  }

  function cancelEdit() {
    setEditing({ mode: "none" })
    setName("")
    setDescription("")
  }

  function cancelDelete() {
    setDeleting(null)
    setDeletingLinked([])
  }

  async function submit() {
    const trimmedName = name.trim()
    if (!trimmedName) return

    if (editing.mode === "create") {
      await createKb.mutateAsync({
        name: trimmedName,
        description: description.trim() ? description.trim() : undefined,
      })
      cancelEdit()
      return
    }

    if (editing.mode === "edit") {
      await updateKb.mutateAsync({
        id: editing.kb.id,
        body: {
          name: trimmedName,
          description: description.trim() ? description.trim() : undefined,
        },
      })
      cancelEdit()
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    await deleteKb.mutateAsync({ id: deleting.id })
    cancelDelete()
  }

  async function handleDelete(kb: Kb) {
    setCheckingLinked(true)
    try {
      const linked = await getKbLinkedAssistants(kb.id)
      setDeleting(kb)
      setDeletingLinked(linked)
    } catch {
      setDeleting(kb)
      setDeletingLinked([])
    } finally {
      setCheckingLinked(false)
    }
  }

  async function handleToggleEnabled(kb: Kb) {
    if (kb.enabled) {
      setCheckingLinked(true)
      try {
        const linked = await getKbLinkedAssistants(kb.id)
        if (linked.length) {
          setDisablingKb({ kb, linked })
        } else {
          setEnabled.mutate({ id: kb.id, enabled: false })
        }
      } catch {
        setEnabled.mutate({ id: kb.id, enabled: false })
      } finally {
        setCheckingLinked(false)
      }
    } else {
      setEnabled.mutate({ id: kb.id, enabled: true })
    }
  }

  async function confirmDisable() {
    if (!disablingKb) return
    setEnabled.mutate({ id: disablingKb.kb.id, enabled: false })
    setDisablingKb(null)
  }

  const filteredList = useMemo(() => {
    const list = kbList.data ?? []
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter((kb) => {
      const n = kb.name?.toLowerCase() ?? ""
      const d = (kb.description ?? "").toLowerCase()
      return n.includes(q) || d.includes(q)
    })
  }, [kbList.data, debouncedQuery])

  function toggleSort(nextSortBy: KbSortBy) {
    setSort((prev) => {
      if (prev.sortBy !== nextSortBy) return { sortBy: nextSortBy, sortDir: "asc" }
      return { sortBy: nextSortBy, sortDir: prev.sortDir === "asc" ? "desc" : "asc" }
    })
  }

  function sortIndicator(forSortBy: KbSortBy) {
    if (sort.sortBy !== forSortBy) return <ArrowUpDown className="h-3.5 w-3.5 opacity-70" />
    return sort.sortDir === "asc" ? "↑" : "↓"
  }

  const countLabel = useMemo(() => {
    const total = kbList.data?.length ?? 0
    const filtered = filteredList.length
    const q = debouncedQuery.trim()
    if (q) return `${filtered}/${total} 个知识库`
    return `${total} 个知识库`
  }, [kbList.data?.length, filteredList.length, debouncedQuery])

  function sortableHeader(label: string, sortBy: KbSortBy) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => toggleSort(sortBy)}
        title="排序"
      >
        <span>{label}</span>
        <span className="text-xs">{sortIndicator(sortBy)}</span>
      </button>
    )
  }

  const columns = useMemo<Array<DataTableColumn<Kb>>>(
    () => [
      {
        key: "name",
        header: sortableHeader("名称", "name"),
        className: "w-[10%]",
        cellClassName: "font-medium",
        render: (kb) => (
          <div className="max-w-[18rem] truncate" title={kb.name}>
            {kb.name}
          </div>
        ),
      },
      {
        key: "description",
        header: "描述",
        className: "w-[18%]",
        cellClassName: "text-muted-foreground",
        render: (kb) => (
          <div className="max-w-[28rem] truncate" title={kb.description || ""}>
            {kb.description || "-"}
          </div>
        ),
      },
      {
        key: "docCount",
        header: "文档数",
        className: "w-[6%]",
        cellClassName: "tabular-nums",
        render: (kb) => kb.docCount,
      },
      {
        key: "charCount",
        header: "字符",
        className: "w-[7%]",
        cellClassName: "tabular-nums",
        render: (kb) => formatCharCountK(kb.charCount),
      },
      {
        key: "createdAt",
        header: sortableHeader("创建时间", "createdAt"),
        className: "w-[14%]",
        cellClassName: "tabular-nums text-muted-foreground",
        render: (kb) => new Date(kb.createdAt).toLocaleString(),
      },
      {
        key: "updatedAt",
        header: sortableHeader("修改时间", "updatedAt"),
        className: "w-[14%]",
        cellClassName: "tabular-nums text-muted-foreground",
        render: (kb) => new Date(kb.updatedAt).toLocaleString(),
      },
      {
        key: "enabled",
        header: "状态",
        className: "w-[8%]",
        render: (kb) => (
          <Switch
            checked={kb.enabled}
            size="sm"
            disabled={setEnabled.isPending || checkingLinked}
            aria-label={kb.enabled ? "停用知识库" : "启用知识库"}
            title={kb.enabled ? "停用" : "启用"}
            onCheckedChange={() => void handleToggleEnabled(kb)}
          />
        ),
      },
      {
        key: "actions",
        header: "操作",
        className: "w-[12%] text-center",
        cellClassName: "text-center",
        render: (kb) => (
          <>
            <div className="inline-flex items-center justify-center gap-0.5 whitespace-nowrap">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => navigate(`/kb/${kb.id}`)}
                disabled={deleteKb.isPending}
                title="管理"
                aria-label="管理"
              >
                <FolderOpen />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => startEdit(kb)}
                disabled={setEnabled.isPending}
                title="设置"
                aria-label="设置"
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void handleDelete(kb)}
                disabled={setEnabled.isPending || deleteKb.isPending || checkingLinked}
                title="删除"
                aria-label="删除"
              >
                <Trash2 />
              </Button>
            </div>
            {setEnabled.isError ? <div className="mt-2 text-xs text-destructive">启停失败，请重试</div> : null}
          </>
        ),
      },
    ],
    [checkingLinked, deleteKb.isPending, navigate, setEnabled.isError, setEnabled.isPending, sort.sortBy, sort.sortDir],
  )
  return (
    <div className="space-y-2">
      <div>
        <Breadcrumb items={[{ label: "知识库" }]} />
        <p className="mt-1 text-sm text-muted-foreground">
          创建、编辑、删除、启停知识库（停用后在所有配置中不可选）
        </p>
      </div>

      <Dialog
        open={editing.mode !== "none"}
        onOpenChange={(open) => {
          if (!open) cancelEdit()
        }}
        title={editing.mode === "create" ? "创建知识库" : editing.mode === "edit" ? "编辑知识库" : undefined}
      >
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium">名称</label>
            <input
              className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：产品文档库"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">描述</label>
            <textarea
              className="mt-2 min-h-24 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选，例如：用于存放 PRD/需求/FAQ"
              rows={4}
            />
          </div>
        </div>

        {createKb.isError || updateKb.isError ? (
          <div className="mt-3 text-sm text-destructive">操作失败，请稍后重试</div>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="lg" onClick={cancelEdit} disabled={isSaving}>
            取消
          </Button>
          <Button size="lg" onClick={submit} disabled={!name.trim()} loading={isSaving} loadingText="处理中">
            {submitLabel}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) cancelDelete()
        }}
        title="确认删除知识库"
      >
        {deleting ? (
          <>
            <div className="space-y-3">
              {deletingLinked.length ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    以下问答助手正在关联知识库「{deleting.name}」，删除后将<b>取消发布</b>这些助手：
                  </p>
                  <ul className="max-h-36 overflow-auto rounded-md border bg-muted/30 p-2 text-sm">
                    {deletingLinked.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 rounded-sm px-2 py-1.5">
                        <span className="truncate">{a.name}</span>
                        {a.published ? (
                          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700">
                            已发布
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs text-zinc-700">
                            未发布
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  将删除知识库「{deleting.name}」，该操作不可恢复，且会同时删除其下的知识项。
                </p>
              )}
              <p className="text-sm text-muted-foreground">确定要继续删除吗？</p>
              {deleteKb.isError ? <div className="text-sm text-destructive">删除失败，请重试</div> : null}
            </div>
            <DialogActions
              confirmLabel="确认删除"
              pending={deleteKb.isPending}
              onCancel={cancelDelete}
              onConfirm={confirmDelete}
            />
          </>
        ) : null}
      </Dialog>

      <Dialog
        open={!!disablingKb}
        onOpenChange={(open) => {
          if (!open) setDisablingKb(null)
        }}
        title="确认停用知识库"
      >
        {disablingKb ? (
          <>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                以下问答助手正在关联知识库「{disablingKb.kb.name}」，停用后将<b>取消发布</b>这些助手：
              </p>
              <ul className="max-h-36 overflow-auto rounded-md border bg-muted/30 p-2 text-sm">
                {disablingKb.linked.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 rounded-sm px-2 py-1.5">
                    <span className="truncate">{a.name}</span>
                    {a.published ? (
                      <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700">
                        已发布
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs text-zinc-700">
                        未发布
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">确定要继续停用吗？</p>
            </div>
            <DialogActions
              confirmLabel="确认停用"
              pending={setEnabled.isPending}
              onCancel={() => setDisablingKb(null)}
              onConfirm={confirmDisable}
            />
          </>
        ) : null}
      </Dialog>

      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">{countLabel}</div>
        <div className="flex items-center gap-2">
          <Input
            clearable
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索知识库名称/描述"
          />
          <Button size="lg" onClick={startCreate}>
            新建知识库
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredList}
        getRowKey={(kb) => kb.id}
        loading={kbList.isLoading}
        error={kbList.isError}
        errorText="加载失败：请确认后端服务可用"
      />
    </div>
  )
}
