import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FolderOpen, Pencil, Trash2 } from "lucide-react"
import type { EvalDataset } from "@/api/evals"
import type { DataTableColumn } from "@/components/ui/data-table"
import type { EvalDatasetEditing } from "@/features/evals/components/EvalDatasetFormDialog"
import {
  useCreateEvalDataset,
  useDeleteEvalDataset,
  useEvalDatasets,
  usePatchEvalDataset,
} from "@/features/evals/hooks/queries"
import { formatEvalDateTime } from "@/features/evals/lib/formatDate"
import { Button } from "@/components/ui/button"

export function useEvalDatasetListPage() {
  const navigate = useNavigate()
  const datasets = useEvalDatasets()
  const createDataset = useCreateEvalDataset()
  const patchDataset = usePatchEvalDataset()
  const deleteDataset = useDeleteEvalDataset()

  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<EvalDatasetEditing>({ mode: "none" })
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [deleting, setDeleting] = useState<EvalDataset | null>(null)

  const items = useMemo(() => datasets.data ?? [], [datasets.data])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q),
    )
  }, [items, query])

  function startCreate() {
    setEditing({ mode: "create" })
    setName("")
    setDescription("")
  }

  function startEdit(dataset: EvalDataset) {
    setEditing({ mode: "edit", id: dataset.id })
    setName(dataset.name)
    setDescription(dataset.description ?? "")
  }

  function cancelEdit() {
    setEditing({ mode: "none" })
    createDataset.reset()
    patchDataset.reset()
  }

  async function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    if (editing.mode === "create") {
      await createDataset.mutateAsync({
        name: trimmed,
        description: description.trim() || undefined,
      })
      cancelEdit()
      return
    }
    if (editing.mode === "edit") {
      await patchDataset.mutateAsync({
        datasetId: editing.id,
        body: {
          name: trimmed,
          description: description.trim() || null,
        },
      })
      cancelEdit()
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    const datasetId = deleting.id
    setDeleting(null)
    try {
      await deleteDataset.mutateAsync({ datasetId })
    } catch {
      // Error toast is handled by the delete mutation.
    }
  }

  const columns = useMemo<Array<DataTableColumn<EvalDataset>>>(
    () => [
      {
        key: "name",
        header: "名称",
        render: (row) => (
          <Button
            variant="ghost"
            className="h-auto max-w-[18rem] truncate px-0 font-medium text-foreground hover:bg-transparent hover:text-primary"
            onClick={() => navigate(`/evals/${row.id}`)}
            title={row.name}
          >
            {row.name}
          </Button>
        ),
      },
      {
        key: "description",
        header: "说明",
        render: (row) => (
          <span className="line-clamp-2 max-w-[320px]">
            {row.description || "-"}
          </span>
        ),
      },
      {
        key: "queryCount",
        header: "问题数",
        cellClassName: "tabular-nums",
        render: (row) => row.queryCount,
      },
      {
        key: "updatedAt",
        header: "更新时间",
        cellClassName: "tabular-nums",
        render: (row) => (
          <span className="whitespace-nowrap">{formatEvalDateTime(row.updatedAt)}</span>
        ),
      },
      {
        key: "actions",
        header: "操作",
        className: "w-[12%] text-center",
        cellClassName: "text-center",
        render: (row) => (
          <div className="inline-flex items-center justify-center gap-0.5 whitespace-nowrap">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-foreground/80 hover:bg-primary/10 hover:text-primary"
              onClick={() => navigate(`/evals/${row.id}`)}
              title="打开"
              aria-label="打开"
            >
              <FolderOpen />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-foreground/80 hover:bg-primary/10 hover:text-primary"
              onClick={() => startEdit(row)}
              title="编辑"
              aria-label="编辑"
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-foreground/80 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleting(row)}
              title="删除"
              aria-label="删除"
            >
              <Trash2 />
            </Button>
          </div>
        ),
      },
    ],
    [navigate],
  )

  return {
    datasets,
    query,
    setQuery,
    filtered,
    countLabel: `${filtered.length} 个数据集`,
    columns,
    editing,
    name,
    setName,
    description,
    setDescription,
    isSaving: createDataset.isPending || patchDataset.isPending,
    hasFormError: createDataset.isError || patchDataset.isError,
    startCreate,
    cancelEdit,
    submit,
    deleting,
    setDeleting,
    confirmDelete,
    deletePending: deleteDataset.isPending,
    deleteError: deleteDataset.isError,
  }
}
