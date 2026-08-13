import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye } from "lucide-react"
import type { EvalRun } from "@/api/evals"
import { Button } from "@/components/ui/button"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { useEvalRuns } from "@/features/evals/hooks/queries"
import { FixedSeedUiDemoBadge, isFixedSeedUiDemoRun } from "@/features/evals/lib/demoRun"
import { formatEvalDateTime } from "@/features/evals/lib/formatDate"
import {
  evalExecutionModeLabel,
  evalRetrieverModeLabel,
  evalRunStatusLabel,
  formatLatencyMs,
  formatMetricNumber,
  isEvalRunActive,
} from "@/features/evals/lib/labels"

type EvalRunHistoryPanelProps = {
  datasetId: string
  onStartEval?: () => void
  canStartEval?: boolean
  unlabeledCount?: number
}

export function EvalRunHistoryPanel({
  datasetId,
  onStartEval,
  canStartEval = true,
  unlabeledCount = 0,
}: EvalRunHistoryPanelProps) {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const runs = useEvalRuns(datasetId, { page, pageSize: 20 })
  const items = runs.data?.items ?? []
  const hasActive = items.some((r) => isEvalRunActive(r.status))

  function toggleSelect(runId: string) {
    setSelected((prev) => {
      if (prev.includes(runId)) return prev.filter((id) => id !== runId)
      if (prev.length >= 2) return [prev[1], runId]
      return [...prev, runId]
    })
  }

  const columns = useMemo<Array<DataTableColumn<EvalRun>>>(
    () => [
      {
        key: "select",
        header: "对比",
        className: "w-[6%] text-center",
        cellClassName: "text-center",
        render: (row) => (
          <input
            type="checkbox"
            checked={selected.includes(row.id)}
            onChange={() => toggleSelect(row.id)}
            aria-label={`选择运行 ${row.name || row.id}`}
          />
        ),
      },
      {
        key: "createdAt",
        header: "创建时间",
        render: (row) => (
          <span className="whitespace-nowrap text-xs">{formatEvalDateTime(row.createdAt)}</span>
        ),
      },
      {
        key: "name",
        header: "名称",
        render: (row) => (
          <div className="flex max-w-[220px] flex-col gap-1">
            <span className="truncate">{row.name || "-"}</span>
            {isFixedSeedUiDemoRun(row) ? <FixedSeedUiDemoBadge /> : null}
          </div>
        ),
      },
      {
        key: "status",
        header: "状态",
        render: (row) => {
          const progress =
            isEvalRunActive(row.status) && row.progressTotal > 0
              ? ` ${row.progressCompleted}/${row.progressTotal}`
              : ""
          return `${evalRunStatusLabel(row.status)}${progress}`
        },
      },
      {
        key: "mode",
        header: "模式",
        render: (row) => evalExecutionModeLabel(row.executionMode),
      },
      {
        key: "retriever",
        header: "检索",
        render: (row) => `${evalRetrieverModeLabel(row.retrieverMode)} · K=${row.topK}`,
      },
      {
        key: "recall",
        header: "Recall@K",
        cellClassName: "tabular-nums",
        render: (row) => formatMetricNumber(row.metrics.recallAtK),
      },
      {
        key: "mrr",
        header: "MRR@K",
        cellClassName: "tabular-nums",
        render: (row) => formatMetricNumber(row.metrics.mrrAtK),
      },
      {
        key: "latency",
        header: "延迟",
        cellClassName: "tabular-nums",
        render: (row) => formatLatencyMs(row.metrics.latencyMs),
      },
      {
        key: "actions",
        header: "操作",
        className: "w-[8%] text-center",
        cellClassName: "text-center",
        render: (row) => (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-foreground/80 hover:bg-primary/10 hover:text-primary"
            onClick={() => navigate(`/evals/runs/${row.id}`)}
            title="详情"
            aria-label="详情"
          >
            <Eye />
          </Button>
        ),
      },
    ],
    [navigate, selected],
  )

  const emptyHint =
    unlabeledCount > 0
      ? `暂无运行记录。仍有 ${unlabeledCount} 个问题未标注，完成标注后可开始评测`
      : "暂无运行记录。完成问题标注后点击「开始评测」"

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          共 {runs.data?.total ?? 0} 次运行
          {hasActive ? " · 有任务进行中，列表会自动刷新" : ""}
          {selected.length > 0 ? ` · 已选 ${selected.length}/2` : ""}
        </div>
        <Button
          variant="outline"
          size="lg"
          disabled={selected.length !== 2}
          onClick={() => {
            if (selected.length !== 2) return
            navigate(
              `/evals/${datasetId}/compare?baseline=${encodeURIComponent(selected[0])}&candidate=${encodeURIComponent(selected[1])}`,
            )
          }}
        >
          对比所选
        </Button>
      </div>

      {(runs.data?.total ?? 0) === 0 && onStartEval ? (
        <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
          {emptyHint}
          {canStartEval ? (
            <>
              。
              <button
                type="button"
                className="text-foreground underline-offset-2 hover:underline"
                onClick={onStartEval}
              >
                开始第一次评测
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={items}
        getRowKey={(item) => item.id}
        loading={runs.isLoading}
        error={runs.isError}
        errorText="运行历史加载失败"
        emptyText={emptyHint}
        pagination={
          runs.data
            ? {
                page,
                pageSize: 20,
                total: runs.data.total,
                onPageChange: setPage,
              }
            : undefined
        }
      />
    </section>
  )
}
