import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Eye } from "lucide-react"
import type { EvalRunResult } from "@/api/evals"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { Button } from "@/components/ui/button"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { LoadingText } from "@/components/ui/loading-text"
import { Page, PageBody, PageHeader } from "@/components/ui/page-header"
import { Select } from "@/components/ui/select"
import { AgentRunTraceDrawer } from "@/features/assistantChat/components/AgentRunTraceDrawer"
import { EvalAgentPolicyPanel } from "@/features/evals/components/EvalAgentPolicyPanel"
import { EvalDecisionBehaviorPanel } from "@/features/evals/components/EvalDecisionBehaviorPanel"
import { EvalResultDetailDrawer } from "@/features/evals/components/EvalResultDetailDrawer"
import {
  useCancelEvalRun,
  useEvalDataset,
  useEvalQueries,
  useEvalRun,
} from "@/features/evals/hooks/queries"
import {
  aggregateDecisionMetricsFromResults,
  formatModes,
  readDecisionMetrics,
  readDecisionSummary,
} from "@/features/evals/lib/decisionMetrics"
import { formatEvalDateTime } from "@/features/evals/lib/formatDate"
import {
  evalExecutionModeLabel,
  evalRetrieverModeLabel,
  evalRunStatusLabel,
  formatLatencyMs,
  formatMetricNumber,
  isEvalRunActive,
} from "@/features/evals/lib/labels"

export function EvalRunDetailPage() {
  const { runId = "" } = useParams()
  const navigate = useNavigate()
  const runQuery = useEvalRun(runId)
  const run = runQuery.data
  const dataset = useEvalDataset(run?.datasetId ?? "", Boolean(run?.datasetId))
  const queries = useEvalQueries(run?.datasetId ?? "", Boolean(run?.datasetId))
  const cancelRun = useCancelEvalRun()

  const [filter, setFilter] = useState<"all" | "failed" | "lowHit">("all")
  const [selectedResult, setSelectedResult] = useState<EvalRunResult | null>(null)
  const [traceRunId, setTraceRunId] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const questionById = useMemo(() => {
    const map = new Map<string, { question: string; referenceAnswer: string | null }>()
    for (const q of queries.data ?? []) {
      map.set(q.id, { question: q.question, referenceAnswer: q.referenceAnswer })
    }
    return map
  }, [queries.data])

  const filteredResults = useMemo(() => {
    const results = run?.results ?? []
    if (filter === "failed") return results.filter((r) => r.status === "failed" || r.error)
    if (filter === "lowHit") return results.filter((r) => Number(r.metrics.hitAtK ?? 0) < 1)
    return results
  }, [filter, run?.results])

  const decisionMetrics = useMemo(() => {
    if (!run) return null
    return (
      readDecisionMetrics(run.metrics) ?? aggregateDecisionMetricsFromResults(run.results ?? [])
    )
  }, [run])

  const columns = useMemo<Array<DataTableColumn<EvalRunResult>>>(
    () => [
      {
        key: "question",
        header: "问题",
        render: (row) => (
          <span className="line-clamp-2 max-w-[240px]">
            {questionById.get(row.queryId)?.question || row.queryId}
          </span>
        ),
      },
      {
        key: "status",
        header: "状态",
        render: (row) => evalRunStatusLabel(row.status),
      },
      {
        key: "modes",
        header: "检索决策",
        render: (row) => {
          const summary = readDecisionSummary(row.metrics)
          if (!summary) return "-"
          const topK =
            summary.finalTopK != null
              ? `k=${summary.finalTopK}`
              : summary.initialTopK != null
                ? `k=${summary.initialTopK}`
                : ""
          return (
            <span className="line-clamp-2 max-w-[180px] text-xs text-muted-foreground">
              {formatModes(summary.selectedModes)}
              {topK ? ` · ${topK}` : ""}
              {summary.rerankUsed ? " · rerank" : ""}
            </span>
          )
        },
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
            onClick={() => setSelectedResult(row)}
            title="详情"
            aria-label="详情"
          >
            <Eye />
          </Button>
        ),
      },
    ],
    [questionById],
  )

  const active = run ? isEvalRunActive(run.status) : false
  const selectedMeta = selectedResult ? questionById.get(selectedResult.queryId) : undefined

  return (
    <Page>
      <PageHeader
        items={[
          { label: "评测与优化", href: "/evals" },
          {
            label: dataset.data?.name || "数据集",
            href: run ? `/evals/${run.datasetId}` : undefined,
          },
          { label: run?.name || (runQuery.isLoading ? "加载中…" : "运行详情") },
        ]}
        description="查看配置快照、进度与逐问题指标；排队/运行中会自动刷新"
        actions={
          run && active ? (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setConfirmCancel(true)}
              disabled={run.cancelRequested || cancelRun.isPending}
            >
              {run.cancelRequested ? "取消中…" : "取消运行"}
            </Button>
          ) : null
        }
      />

      <PageBody className="space-y-4">
        {runQuery.isLoading ? (
          <div className="rounded-lg border border-border bg-card px-4 py-10">
            <LoadingText className="mx-auto">加载中</LoadingText>
          </div>
        ) : runQuery.isError || !run ? (
          <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-destructive">
            运行不存在或加载失败
          </div>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              <MetricCard label="状态" value={evalRunStatusLabel(run.status)} />
              <MetricCard
                label="进度"
                value={
                  run.progressTotal > 0
                    ? `${run.progressCompleted}/${run.progressTotal}`
                    : String(run.resultCount)
                }
              />
              <MetricCard label="Recall@K" value={formatMetricNumber(run.metrics.recallAtK)} />
              <MetricCard label="MRR@K" value={formatMetricNumber(run.metrics.mrrAtK)} />
              <MetricCard label="NDCG@K" value={formatMetricNumber(run.metrics.ndcgAtK)} />
              <MetricCard label="平均延迟" value={formatLatencyMs(run.metrics.latencyMs)} />
            </section>

            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="text-sm font-medium">运行配置（创建时冻结）</div>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                <div>实验类型：{evalExecutionModeLabel(run.executionMode)}</div>
                <div>
                  检索：{evalRetrieverModeLabel(run.retrieverMode)} · Top K = {run.topK}
                </div>
                <div>
                  Agent Policy：
                  {typeof run.configSnapshot?.agentPolicyId === "string"
                    ? run.configSnapshot.agentPolicyId
                    : "-"}
                </div>
                <div>失败题数：{run.errorCount}</div>
                <div>创建：{formatEvalDateTime(run.createdAt)}</div>
                <div>开始：{run.startedAt ? formatEvalDateTime(run.startedAt) : "-"}</div>
                <div>结束：{run.finishedAt ? formatEvalDateTime(run.finishedAt) : "-"}</div>
              </div>
              {run.configSnapshot ? (
                <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-muted/40 p-3 text-xs">
                  {JSON.stringify(run.configSnapshot, null, 2)}
                </pre>
              ) : null}
            </section>

            <EvalDecisionBehaviorPanel metrics={decisionMetrics} />

            {run.executionMode === "agent" || run.executionMode === "auto" ? (
              <EvalAgentPolicyPanel
                compact
                highlightPolicyId={
                  typeof run.configSnapshot?.agentPolicyId === "string"
                    ? run.configSnapshot.agentPolicyId
                    : null
                }
                evidenceEvalRunId={
                  run.status === "succeeded" || run.status === "partial" ? run.id : null
                }
              />
            ) : null}

            <section className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  逐问题结果 · {filteredResults.length} 条
                  {active ? " · 自动刷新中" : ""}
                </div>
                <div className="w-48">
                  <Select
                    value={filter}
                    onValueChange={(value) => setFilter(value as typeof filter)}
                    options={[
                      { value: "all", label: "全部问题" },
                      { value: "failed", label: "失败优先" },
                      { value: "lowHit", label: "未命中相关" },
                    ]}
                  />
                </div>
              </div>
              <DataTable
                columns={columns}
                data={filteredResults}
                getRowKey={(item) => item.id}
                emptyText="暂无结果（任务排队或尚未写入）"
              />
            </section>
          </>
        )}

        <EvalResultDetailDrawer
          open={!!selectedResult}
          result={selectedResult}
          question={selectedMeta?.question}
          referenceAnswer={selectedMeta?.referenceAnswer}
          onClose={() => setSelectedResult(null)}
          onOpenTrace={(agentRunId) => setTraceRunId(agentRunId)}
        />

        <AgentRunTraceDrawer
          open={!!traceRunId}
          runId={traceRunId}
          onClose={() => setTraceRunId(null)}
        />

        <ConfirmDeleteDialog
          open={confirmCancel}
          title="确认取消运行"
          description="将在当前问题边界停止后续实验；已完成的问题结果会保留。"
          confirmLabel="确认取消"
          confirming={cancelRun.isPending}
          errorText={cancelRun.isError ? "取消失败，请重试" : null}
          onCancel={() => setConfirmCancel(false)}
          onConfirm={async () => {
            if (!run) return
            await cancelRun.mutateAsync({ runId: run.id })
            setConfirmCancel(false)
          }}
        />

        {run ? (
          <div className="text-xs text-muted-foreground">
            <button
              type="button"
              className="hover:underline"
              onClick={() => navigate(`/evals/${run.datasetId}`)}
            >
              返回数据集
            </button>
          </div>
        ) : null}
      </PageBody>
    </Page>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}
