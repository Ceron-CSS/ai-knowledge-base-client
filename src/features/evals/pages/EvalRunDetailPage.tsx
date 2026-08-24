import { useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Eye, Info } from "lucide-react"
import type { EvalRunResult } from "@/api/evals"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { Button } from "@/components/ui/button"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { LoadingText } from "@/components/ui/loading-text"
import { Page, PageBody, PageHeader } from "@/components/ui/page-header"
import { Select } from "@/components/ui/select"
import { Tooltip } from "@/components/ui/tooltip"
import { AgentRunTraceDrawer } from "@/features/assistantChat/components/AgentRunTraceDrawer"
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
  readJudgeAverage,
  readDecisionMetrics,
  readDecisionSummary,
} from "@/features/evals/lib/decisionMetrics"
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
import { evalRunConfigSummary, evalRunShortId, evalRunTitle } from "@/features/evals/lib/runDisplay"
import { openKbItemChunk } from "@/features/kb/lib/openKbItemChunk"

export function EvalRunDetailPage() {
  const { runId = "" } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const runQuery = useEvalRun(runId)
  const run = runQuery.data
  const dataset = useEvalDataset(run?.datasetId ?? "", Boolean(run?.datasetId))
  const queries = useEvalQueries(run?.datasetId ?? "", Boolean(run?.datasetId))
  const cancelRun = useCancelEvalRun()

  const [filter, setFilter] = useState<"all" | "failed" | "lowHit">("all")
  const [traceRunId, setTraceRunId] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const selectedResultId = searchParams.get("result")
  const selectedResult = useMemo(() => {
    if (!selectedResultId) return null
    return run?.results?.find((result) => result.id === selectedResultId) ?? null
  }, [run?.results, selectedResultId])

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
  const answerQualityMetrics = useMemo(() => {
    if (!run) {
      return {
        faithfulness: null,
        answerRelevancy: null,
        citationSupport: null,
      }
    }
    return {
      faithfulness: readJudgeAverage(run.metrics, run.results, "faithfulness"),
      answerRelevancy: readJudgeAverage(run.metrics, run.results, "answerRelevancy"),
      citationSupport: readJudgeAverage(run.metrics, run.results, "citationSupport"),
    }
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
        key: "answer",
        header: "答案",
        render: (row) => (
          <span className="line-clamp-2 max-w-[260px]">
            {row.generatedAnswer || "-"}
          </span>
        ),
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
            onClick={() => {
              const next = new URLSearchParams(searchParams)
              next.set("result", row.id)
              setSearchParams(next, { replace: true })
            }}
            title="详情"
            aria-label="详情"
          >
            <Eye />
          </Button>
        ),
      },
    ],
    [questionById, searchParams, setSearchParams],
  )

  const active = run ? isEvalRunActive(run.status) : false
  const isSeedDemo = run ? isFixedSeedUiDemoRun(run) : false
  const selectedMeta = selectedResult ? questionById.get(selectedResult.queryId) : undefined
  const decisionPanelTitle =
    run?.executionMode === "agent" || run?.executionMode === "auto"
      ? "Agent 决策行为"
      : "检索决策摘要"
  const decisionPanelDescription =
    run?.executionMode === "agent" || run?.executionMode === "auto"
      ? "用于检查 Agent 每道题选择了哪些检索工具、是否二次检索、是否重排，以及最终为什么停止。"
      : "用于检查固定评测每道题实际使用的召回/排序策略、Top K 和停止原因。"

  return (
    <Page fill>
      <PageHeader
        items={[
          { label: "评测数据集", href: "/evals" },
          {
            label: dataset.data?.name || "数据集",
            href: run ? `/evals/${run.datasetId}?tab=runs` : undefined,
          },
          { label: run ? evalRunTitle(run) : runQuery.isLoading ? "加载中…" : "运行详情" },
        ]}
        description={
          run
            ? `${evalRunConfigSummary(run)} · Run ${evalRunShortId(run)}`
            : "查看配置快照、进度与逐问题指标；排队/运行中会自动刷新"
        }
        actions={
          run && active ? (
            <Button
              variant="dialog-cancel"
              size="lg"
              onClick={() => setConfirmCancel(true)}
              disabled={run.cancelRequested || cancelRun.isPending}
            >
              {run.cancelRequested ? "取消中…" : "取消运行"}
            </Button>
          ) : null
        }
      />

      <PageBody className="min-h-0 overflow-y-auto space-y-4">
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
            <section className="grid grid-flow-col auto-cols-[minmax(9.5rem,1fr)] gap-3 overflow-x-auto pb-1">
              <MetricCard label="状态" value={evalRunStatusLabel(run.status)} />
              <MetricCard
                label="进度"
                value={
                  run.progressTotal > 0
                    ? `${run.progressCompleted}/${run.progressTotal}`
                    : String(run.resultCount)
                }
              />
              <MetricCard
                label="检索 Recall@K"
                value={formatMetricNumber(run.metrics.recallAtK)}
                help="人工标注的相关 Chunk 中，有多少被本次 Top K 结果找回。越高表示召回越完整。"
              />
              <MetricCard
                label="检索 MRR@K"
                value={formatMetricNumber(run.metrics.mrrAtK)}
                help="第一个正确 Chunk 的排名质量。越接近 1，说明正确证据越靠前。"
              />
              <MetricCard
                label="答案生成率"
                value={formatPercent(run.metrics.answerGeneratedRate)}
                help="成功生成答案的题目占比。失败、取消或生成异常会拉低该比例。"
              />
              <MetricCard
                label="事实一致性"
                value={formatJudgeScore(answerQualityMetrics.faithfulness)}
                help="模型评审：答案中的事实是否能被召回上下文支持。未勾选该评审时显示未评测。"
              />
              <MetricCard
                label="回答相关性"
                value={formatJudgeScore(answerQualityMetrics.answerRelevancy)}
                help="模型评审：答案是否直接回应问题，是否跑题。未勾选该评审时显示未评测。"
              />
              <MetricCard
                label="引用支撑"
                value={formatJudgeScore(answerQualityMetrics.citationSupport)}
                help="检查答案里的引用编号是否能被对应引用原文支撑。未勾选该评审时显示未评测。"
              />
              <MetricCard
                label="平均延迟"
                value={formatLatencyMs(run.metrics.latencyMs)}
                help="每道题从检索到生成、评审完成的平均耗时。"
              />
            </section>

            {isSeedDemo ? (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-100">
                <FixedSeedUiDemoBadge />
                <span className="ml-2">
                  This run is fixed seed data for UI walkthroughs; do not use its preset metrics as real benchmark conclusions.
                </span>
              </div>
            ) : null}

            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="text-sm font-medium">运行配置（创建时冻结）</div>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                <div>实验类型：{evalExecutionModeLabel(run.executionMode)}</div>
                <div>
                  检索：{evalRetrieverModeLabel(run.retrieverMode)} · Top K = {run.topK}
                </div>
                <div>策略/配置：{evalRunConfigSummary(run)}</div>
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

            <EvalDecisionBehaviorPanel
              metrics={decisionMetrics}
              title={decisionPanelTitle}
              description={decisionPanelDescription}
            />

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
          onClose={() => {
            if (searchParams.has("result")) {
              const next = new URLSearchParams(searchParams)
              next.delete("result")
              setSearchParams(next, { replace: true })
            }
          }}
          onOpenTrace={(agentRunId) => setTraceRunId(agentRunId)}
          onOpenCitation={(citation) => openKbItemChunk(navigate, citation)}
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
              onClick={() => navigate(`/evals/${run.datasetId}?tab=runs`)}
            >
              返回数据集
            </button>
          </div>
        ) : null}
      </PageBody>
    </Page>
  )
}

function formatPercent(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-"
  return `${(value * 100).toFixed(1)}%`
}

function formatJudgeScore(value: number | null) {
  if (value === null) return "未评测"
  return formatMetricNumber(value)
}

function MetricCard({
  label,
  value,
  help,
}: {
  label: string
  value: string
  help?: string
}) {
  return (
    <div className="relative z-0 min-h-[5.75rem] rounded-lg border border-border bg-card p-3 shadow-sm focus-within:z-20 hover:z-20">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 truncate text-xs text-muted-foreground">{label}</div>
        {help ? (
          <Tooltip content={help} className="max-w-64 whitespace-normal text-left leading-relaxed">
            <button
              type="button"
              className="rounded-full text-muted-foreground/70 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label={help}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        ) : null}
      </div>
      <div className="mt-2 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}
