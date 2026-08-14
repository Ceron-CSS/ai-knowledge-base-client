import { useCallback, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { Pencil, Trash2 } from "lucide-react"
import type { EvalQuery } from "@/api/evals"
import { HttpError } from "@/api/http"
import type { DataTableColumn } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import {
  useCreateEvalQuery,
  useDeleteEvalQuery,
  useEvalDataset,
  useEvalQueries,
  usePatchEvalQuery,
} from "@/features/evals/hooks/queries"
import { formatEvalDateTime } from "@/features/evals/lib/formatDate"

export type EvalDetailTab = "queries" | "runs"

export function useEvalDatasetDetailPage() {
  const { datasetId = "" } = useParams()
  const dataset = useEvalDataset(datasetId)
  const queries = useEvalQueries(datasetId)
  const createQuery = useCreateEvalQuery(datasetId)
  const patchQuery = usePatchEvalQuery(datasetId)
  const deleteQuery = useDeleteEvalQuery(datasetId)

  const [tab, setTab] = useState<EvalDetailTab>("queries")
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingQuery, setEditingQuery] = useState<EvalQuery | null>(null)
  const [deleting, setDeleting] = useState<EvalQuery | null>(null)
  const [search, setSearch] = useState("")

  const items = useMemo(() => queries.data ?? [], [queries.data])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        (item.referenceAnswer ?? "").toLowerCase().includes(q),
    )
  }, [items, search])

  function startCreate() {
    setEditingQuery(null)
    setEditorOpen(true)
    createQuery.reset()
    patchQuery.reset()
  }

  const startEdit = useCallback((query: EvalQuery) => {
    setEditingQuery(query)
    setEditorOpen(true)
    createQuery.reset()
    patchQuery.reset()
  }, [createQuery, patchQuery])

  function cancelEditor() {
    setEditorOpen(false)
    setEditingQuery(null)
    createQuery.reset()
    patchQuery.reset()
  }

  async function submitQuery(body: {
    question: string
    referenceAnswer: string | null
    relevantChunkIds: string[]
    questionType?: string | null
    shouldAbstain?: boolean
  }) {
    if (editingQuery) {
      await patchQuery.mutateAsync({ queryId: editingQuery.id, body })
    } else {
      await createQuery.mutateAsync(body)
    }
    cancelEditor()
  }

  async function confirmDelete() {
    if (!deleting) return
    await deleteQuery.mutateAsync({ queryId: deleting.id })
    setDeleting(null)
  }

  const saveErrorText = useMemo(() => {
    const err = editingQuery ? patchQuery.error : createQuery.error
    if (!err) return null
    if (err instanceof HttpError) return err.message
    if (err instanceof Error) return err.message
    return "保存失败，请稍后重试"
  }, [createQuery.error, editingQuery, patchQuery.error])

  const columns = useMemo<Array<DataTableColumn<EvalQuery>>>(
    () => [
      {
        key: "question",
        header: "问题",
        render: (row) => <span className="line-clamp-2 max-w-[360px]">{row.question}</span>,
      },
      {
        key: "reference",
        header: "参考答案",
        render: (row) => (
          <span className="line-clamp-2 max-w-[240px] text-muted-foreground">
            {row.referenceAnswer || "-"}
          </span>
        ),
      },
      {
        key: "labels",
        header: "相关 Chunk",
        cellClassName: "tabular-nums",
        render: (row) => row.relevantChunkIds.length,
      },
      {
        key: "type",
        header: "类型",
        render: (row) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {formatQuestionType(row.questionType)}
            {row.shouldAbstain ? " · 应拒答" : ""}
          </span>
        ),
      },
      {
        key: "updatedAt",
        header: "更新时间",
        render: (row) => (
          <span className="whitespace-nowrap text-xs">{formatEvalDateTime(row.updatedAt)}</span>
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
              onClick={() => startEdit(row)}
              title="编辑/标注"
              aria-label="编辑/标注"
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
    [startEdit],
  )

  return {
    datasetId,
    dataset,
    queries,
    tab,
    setTab,
    search,
    setSearch,
    filtered,
    columns,
    editorOpen,
    editingQuery,
    startCreate,
    cancelEditor,
    submitQuery,
    isSaving: createQuery.isPending || patchQuery.isPending,
    hasSaveError: createQuery.isError || patchQuery.isError,
    saveErrorText,
    deleting,
    setDeleting,
    confirmDelete,
    deletePending: deleteQuery.isPending,
    deleteError: deleteQuery.isError,
    unlabeledCount: items.filter((q) => q.relevantChunkIds.length === 0).length,
  }
}

function formatQuestionType(value: string | null) {
  if (!value) return "未分类"
  const labels: Record<string, string> = {
    single_fact: "单事实",
    paraphrase: "同义表达",
    multi_condition: "多条件",
    cross_chunk: "跨 Chunk",
    similar_distractor: "相似干扰",
    insufficient_evidence: "证据不足",
    small_talk: "闲聊",
    online_failure: "线上失败",
  }
  return labels[value] ?? value
}
