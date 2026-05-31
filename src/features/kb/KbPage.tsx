import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowUpDown } from "lucide-react"
import type { Kb, KbLinkedAssistant, KbSortBy, SortDir } from "@/api/kb"
import { getKbLinkedAssistants } from "@/api/kb"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { useCreateKb, useDeleteKb, useKbList, useSetKbEnabled, useUpdateKb } from "@/features/kb/queries"
import { Dialog } from "@/components/ui/dialog"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { useDebouncedValue } from "@/lib/useDebouncedValue"

type EditingState =
  | { mode: "create" }
  | { mode: "edit"; kb: Kb }
  | { mode: "none" }

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

  async function handleToggleEnabled(kb: Kb) {
    if (kb.enabled) {
      // Disabling: check linked assistants first
      setCheckingLinked(true)
      try {
        const linked = await getKbLinkedAssistants(kb.id)
        if (linked.length) {
          setDisablingKb({ kb, linked })
        } else {
          setEnabled.mutate({ id: kb.id, enabled: false })
        }
      } catch {
        // If check fails, still allow disabling
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

  function resetListState() {
    setQuery("")
    setSort({ sortBy: "createdAt", sortDir: "desc" })
  }

  const countLabel = useMemo(() => {
    const total = kbList.data?.length ?? 0
    const filtered = filteredList.length
    const q = debouncedQuery.trim()
    if (q) return `${filtered}/${total} 个知识库`
    return `${total} 个知识库`
  }, [kbList.data?.length, filteredList.length, debouncedQuery])

  return (
    <div className="space-y-2">
      <div>
        <Breadcrumb items={[{ label: "知识库" }]} />
        <p className="mt-1 text-sm text-muted-foreground">创建、编辑、删除、启停知识库（停用后在所有配置中不可选）</p>
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
        description={deleting ? `将删除知识库「${deleting.name}」该操作不可恢复，且会同时删除其下的知识项与问答日志` : undefined}
        errorText={deleteKb.isError ? "删除失败，请重试" : null}
        confirming={deleteKb.isPending}
      />

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
                      <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700">已发布</span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs text-zinc-700">未发布</span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">确定要继续停用吗？</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-md border px-3 py-2 text-sm hover:bg-muted/60"
                onClick={() => setDisablingKb(null)}
                disabled={setEnabled.isPending}
              >
                取消
              </button>
              <button
                className="rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50"
                onClick={confirmDisable}
                disabled={setEnabled.isPending}
              >
                {setEnabled.isPending ? "处理中..." : "确认停用"}
              </button>
            </div>
          </>
        ) : null}
      </Dialog>

      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">{countLabel}</div>
        <div className="flex items-center gap-2">
          <input
            className="w-56 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索知识库名称/描述"
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
        <div className="rounded-lg border bg-background px-4 py-10 text-center text-sm text-muted-foreground">加载中...</div>
      ) : kbList.isError ? (
        <div className="rounded-lg border bg-background px-4 py-10 text-center text-sm text-destructive">加载失败：请确认后端服务可用</div>
      ) : filteredList.length ? (
        <div className="overflow-x-auto rounded-lg border">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-muted/40">
                <tr className="border-b">
                  <th className="w-[10%] px-3 py-2 font-medium">
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
                  <th className="w-[18%] px-3 py-2 font-medium">描述</th>
                  <th className="w-[6%] px-3 py-2 font-medium">文档数</th>
                  <th className="w-[7%] px-3 py-2 font-medium">字符</th>
                  <th className="w-[14%] px-3 py-2 font-medium">
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
                  <th className="w-[14%] px-3 py-2 font-medium">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort("updatedAt")}
                      title="排序"
                    >
                      <span>修改时间</span>
                      <span className="text-xs">{sortIndicator("updatedAt")}</span>
                    </button>
                  </th>
                  <th className="w-[6%] px-3 py-2 font-medium">状态</th>
                  <th className="w-[25%] px-3 py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((kb) => (
                  <tr key={kb.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2 font-medium">
                      <div className="max-w-[18rem] truncate" title={kb.name}>
                        {kb.name}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      <div className="max-w-[28rem] truncate" title={kb.description || ""}>
                        {kb.description || "-"}
                      </div>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{kb.docCount}</td>
                    <td className="px-3 py-2 tabular-nums">{formatCharCountK(kb.charCount)}</td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {new Date(kb.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">
                      {new Date(kb.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
                          kb.enabled ? "bg-emerald-500/10 text-emerald-700" : "bg-zinc-500/10 text-zinc-700",
                        ].join(" ")}
                      >
                        {kb.enabled ? "启用" : "停用"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <button
                          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted/60"
                          onClick={() => navigate(`/kb/${kb.id}`)}
                          disabled={deleteKb.isPending}
                        >
                          管理
                        </button>
                        <button
                          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted/60 disabled:opacity-50"
                          onClick={() => handleToggleEnabled(kb)}
                          disabled={setEnabled.isPending || checkingLinked}
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
                      {setEnabled.isError ? <div className="mt-2 text-xs text-destructive">启停失败，请重试</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : kbList.data?.length ? (
          <div className="rounded-lg border bg-background px-4 py-10 text-center text-sm text-muted-foreground">无匹配结果</div>
        ) : (
          <div className="rounded-lg border bg-background px-4 py-10 text-center text-sm text-muted-foreground">暂无知识库，先创建一个吧</div>
        )}
    </div>
  )
}
