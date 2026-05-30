import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowUpDown } from "lucide-react"
import type { Kb, KbSortBy, SortDir } from "@/api/kb"
import { useCreateKb, useDeleteKb, useKbList, useSetKbEnabled, useUpdateKb } from "@/features/kb/queries"
import { Dialog } from "@/components/ui/dialog"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { useDebouncedValue } from "@/lib/useDebouncedValue"

type EditingState =
  | { mode: "create" }
  | { mode: "edit"; kb: Kb }
  | { mode: "none" }

const KB_SORT_KEY = "kb.listSort"

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
      // ignore
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

  function resetListState() {
    setQuery("")
    setSort({ sortBy: "createdAt", sortDir: "desc" })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">知识库</h1>
        </div>
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
          <div className="mt-3 text-sm text-destructive">操作失败，请稍后重试。</div>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-md border px-3 py-2 text-sm hover:bg-muted/60" onClick={cancelEdit} disabled={isSaving}>
            取消
          </button>
          <button
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            onClick={submit}
            disabled={!name.trim() || isSaving}
          >
            {isSaving ? "处理中..." : submitLabel}
          </button>
        </div>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleting}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        description={deleting ? `将删除知识库「${deleting.name}」。该操作不可恢复，且会同时删除其下的知识项与问答日志。` : undefined}
        errorText={deleteKb.isError ? "删除失败，请重试。" : null}
        confirming={deleteKb.isPending}
      />

      <div className="rounded-lg border bg-background">
        <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
          <div className="text-sm font-medium">知识库列表</div>
          <div className="flex items-center gap-2">
            <input
              className="w-64 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索名称/描述"
            />
            <button className="rounded-md border px-3 py-2 text-sm hover:bg-muted/60" onClick={resetListState}>
              重置
            </button>
            <button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground" onClick={startCreate}>
              新建知识库
            </button>
          </div>
        </div>
        {kbList.isLoading ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">加载中...</div>
        ) : kbList.isError ? (
          <div className="px-4 py-6 text-sm text-destructive">加载失败：请确认后端服务可用。</div>
        ) : filteredList.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="px-4 py-3 font-medium">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort("name")}
                      title="排序"
                    >
                      <span>名称</span>
                      <span className="text-xs">{sortIndicator("name")}</span>
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">描述</th>
                  <th className="px-4 py-3 font-medium">文档数</th>
                  <th className="px-4 py-3 font-medium">字符</th>
                  <th className="px-4 py-3 font-medium">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort("createdAt")}
                      title="排序"
                    >
                      <span>创建时间</span>
                      <span className="text-xs">{sortIndicator("createdAt")}</span>
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((kb) => (
                  <tr key={kb.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">
                      <div className="max-w-[18rem] truncate" title={kb.name}>
                        {kb.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="max-w-[28rem] truncate" title={kb.description || ""}>
                        {kb.description || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{kb.docCount}</td>
                    <td className="px-4 py-3 tabular-nums">{kb.charCount}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {new Date(kb.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
                          kb.enabled ? "bg-emerald-500/10 text-emerald-700" : "bg-zinc-500/10 text-zinc-700",
                        ].join(" ")}
                      >
                        {kb.enabled ? "启用" : "停用"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted/60"
                          onClick={() => navigate(`/kb/${kb.id}`)}
                          disabled={deleteKb.isPending}
                        >
                          管理
                        </button>
                        <button
                          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted/60 disabled:opacity-50"
                          onClick={() => setEnabled.mutate({ id: kb.id, enabled: !kb.enabled })}
                          disabled={setEnabled.isPending}
                        >
                          {kb.enabled ? "停用" : "启用"}
                        </button>
                        <button
                          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted/60"
                          onClick={() => startEdit(kb)}
                          disabled={setEnabled.isPending}
                        >
                          设置
                        </button>
                        <button
                          className="rounded-md border border-destructive/40 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
                          onClick={() => setDeleting(kb)}
                          disabled={setEnabled.isPending || deleteKb.isPending}
                        >
                          删除
                        </button>
                      </div>
                      {setEnabled.isError ? <div className="mt-2 text-xs text-destructive">启停失败，请重试。</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : kbList.data?.length ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">无匹配结果</div>
        ) : (
          <div className="px-4 py-6 text-sm text-muted-foreground">暂无知识库，先创建一个吧。</div>
        )}
      </div>
    </div>
  )
}
