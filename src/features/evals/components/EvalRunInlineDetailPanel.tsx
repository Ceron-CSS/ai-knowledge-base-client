import { Eye, X } from "lucide-react"
import { useState } from "react"
import type { EvalRunResult } from "@/api/evals"
import { Button } from "@/components/ui/button"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { LoadingText } from "@/components/ui/loading-text"
import { EvalResultDetailDrawer } from "@/features/evals/components/EvalResultDetailDrawer"
import { useEvalQueries, useEvalRun } from "@/features/evals/hooks/queries"
import { aggregateDecisionMetricsFromResults, readDecisionMetrics } from "@/features/evals/lib/decisionMetrics"
import { FixedSeedUiDemoBadge, isFixedSeedUiDemoRun } from "@/features/evals/lib/demoRun"
import { formatEvalDateTime } from "@/features/evals/lib/formatDate"
import {
  evalRunStatusLabel,
  formatLatencyMs,
  formatMetricNumber,
} from "@/features/evals/lib/labels"
import { evalRunConfigSummary, evalRunShortId, evalRunTitle } from "@/features/evals/lib/runDisplay"

type EvalRunInlineDetailPanelProps = {
  runId: string
  onClose: () => void
}

export function EvalRunInlineDetailPanel({ runId, onClose }: EvalRunInlineDetailPanelProps) {
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null)
  const run = useEvalRun(runId)
  const queries = useEvalQueries(run.data?.datasetId ?? "", Boolean(run.data?.datasetId))

  const questionById = new Map(
    (queries.data ?? []).map((query) => [
      query.id,
      { question: query.question, referenceAnswer: query.referenceAnswer },
    ] as const)
  )
  const selectedResult =
    run.data?.results.find((result) => result.id === selectedResultId) ?? null
  const selectedMeta = selectedResult ? questionById.get(selectedResult.queryId) : undefined

  const resultColumns: Array<DataTableColumn<EvalRunResult>> = [
    {
      key: "query",
      header: "问题",
      render: (row) => (
        <span className="line-clamp-2 max-w-[320px]">
          {questionById.get(row.queryId)?.question || `问题 ${row.queryId.slice(0, 8)}`}
        </span>
      ),
    },
    {
      key: "status",
      header: "状态",
      render: (row) => evalRunStatusLabel(row.status),
    },
    {
      key: "answer",
      header: "答案",
      render: (row) => (
        <span className="line-clamp-2 max-w-[360px]">
          {row.generatedAnswer || "-"}
        </span>
      ),
    },
    {
      key: "recall",
      header: "Recall",
      cellClassName: "tabular-nums",
      render: (row) => formatMetricNumber(row.metrics.recallAtK),
    },
    {
      key: "mrr",
      header: "MRR",
      cellClassName: "tabular-nums",
      render: (row) => formatMetricNumber(row.metrics.mrrAtK),
    },
    {
      key: "hit",
      header: "Hit",
      cellClassName: "tabular-nums",
      render: (row) => formatMetricNumber(row.metrics.hitAtK, 0),
    },
    {
      key: "latency",
      header: "耗时",
      cellClassName: "tabular-nums",
      render: (row) => formatLatencyMs(row.durationMs ?? row.metrics.latencyMs),
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
          onClick={() => setSelectedResultId(row.id)}
          title="查看完整结果"
          aria-label="查看完整结果"
        >
          <Eye />
        </Button>
      ),
    },
  ]

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      {run.isLoading ? (
        <LoadingText className="py-6">加载运行详情</LoadingText>
      ) : run.isError || !run.data ? (
        <div className="py-6 text-sm text-destructive">运行详情加载失败</div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-medium">{evalRunTitle(run.data)}</h3>
                {isFixedSeedUiDemoRun(run.data) ? <FixedSeedUiDemoBadge /> : null}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {evalRunConfigSummary(run.data)} · 创建 {formatEvalDateTime(run.data.createdAt)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Run {evalRunShortId(run.data)}
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="关闭运行详情">
              <X />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Metric label="状态" value={evalRunStatusLabel(run.data.status)} />
            <Metric label="进度" value={`${run.data.progressCompleted}/${run.data.progressTotal || run.data.resultCount}`} />
            <Metric label="失败题数" value={String(run.data.errorCount)} />
            <Metric label="检索 Recall" value={formatMetricNumber(run.data.metrics.recallAtK)} />
            <Metric label="检索 MRR" value={formatMetricNumber(run.data.metrics.mrrAtK)} />
            <Metric label="答案生成率" value={formatPercent(run.data.metrics.answerGeneratedRate)} />
            <Metric label="平均耗时" value={formatLatencyMs(run.data.metrics.latencyMs)} />
          </div>

          <RunSummary run={run.data} />

          <div className="space-y-2">
            <div className="text-sm font-medium">逐问题结果 · {run.data.results.length} 条</div>
            <DataTable
              columns={resultColumns}
              data={run.data.results}
              getRowKey={(item) => item.id}
              emptyText="暂无结果（任务排队或尚未写入）"
            />
          </div>
          <EvalResultDetailDrawer
            open={Boolean(selectedResult)}
            result={selectedResult}
            question={selectedMeta?.question}
            referenceAnswer={selectedMeta?.referenceAnswer}
            onClose={() => setSelectedResultId(null)}
          />
        </div>
      )}
    </section>
  )
}

function formatPercent(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-"
  return `${(value * 100).toFixed(1)}%`
}

function RunSummary({ run }: { run: import("@/api/evals").EvalRunDetail }) {
  const decisionMetrics =
    readDecisionMetrics(run.metrics) ?? aggregateDecisionMetricsFromResults(run.results ?? [])

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
      <div className="font-medium">运行摘要</div>
      <div className="mt-2 grid gap-2 text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
        <div>评测内容：{evalRunTitle(run)}</div>
        <div>策略/配置：{evalRunConfigSummary(run)}</div>
        <div>开始：{run.startedAt ? formatEvalDateTime(run.startedAt) : "尚未开始"}</div>
        <div>结束：{run.finishedAt ? formatEvalDateTime(run.finishedAt) : "-"}</div>
        <div>结果：{run.resultCount} 条</div>
        <div>样本：{decisionMetrics?.sampleCount ?? (run.progressTotal || "-")}</div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/50 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  )
}
