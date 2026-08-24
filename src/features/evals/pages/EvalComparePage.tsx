import { useMemo, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { LoadingText } from "@/components/ui/loading-text"
import { Page, PageBody, PageHeader } from "@/components/ui/page-header"
import { Select } from "@/components/ui/select"
import { Tooltip } from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import type {
  AgentPolicyConfig,
  EvalRun,
  EvalRunCompareQueryChange,
} from "@/api/evals"
import { EvalBehaviorComparePanel } from "@/features/evals/components/EvalBehaviorComparePanel"
import { EvalQuestionCompareDialog } from "@/features/evals/components/EvalQuestionCompareDialog"
import {
  useEvalDataset,
  useEvalRunCompare,
  useEvalRunResult,
  useEvalRuns,
} from "@/features/evals/hooks/queries"
import { formatEvalDateTime } from "@/features/evals/lib/formatDate"
import {
  evalExecutionModeLabel,
  evalRetrieverModeLabel,
  formatLatencyMs,
  formatMetricNumber,
} from "@/features/evals/lib/labels"
import {
  buildQueryComparisonSummary,
  formatSignedMetricDelta,
} from "@/features/evals/lib/comparePresentation"
import {
  evalRunConfigSummary,
  evalRunShortId,
  evalRunTitle,
} from "@/features/evals/lib/runDisplay"

type Filter = "all" | "improved" | "regressed" | "unchanged" | "incomparable"
const METRIC_ROWS = [
  {
    key: "recallAtK",
    label: "Recall@K",
    kind: "metric",
    help: "前 K 个召回结果覆盖了多少相关 Chunk。越接近 1，说明遗漏的相关内容越少。",
  },
  {
    key: "precisionAtK",
    label: "Precision@K",
    kind: "metric",
    help: "前 K 个召回结果中，相关 Chunk 所占的比例。越接近 1，说明无关内容越少。",
  },
  {
    key: "hitAtK",
    label: "Hit@K",
    kind: "metric",
    help: "前 K 个结果中是否至少命中一个相关 Chunk；这里展示整批问题的平均命中率。",
  },
  {
    key: "mrrAtK",
    label: "MRR@K",
    kind: "metric",
    help: "第一个相关 Chunk 排名的倒数均值。越接近 1，说明首个相关结果出现得越靠前。",
  },
  {
    key: "ndcgAtK",
    label: "NDCG@K",
    kind: "metric",
    help: "综合衡量相关结果的排序质量，并对靠前位置赋予更高权重。越接近 1，排序越理想。",
  },
  {
    key: "latencyMs",
    label: "平均耗时",
    kind: "latency",
    help: "每个问题从开始执行到完成的平均时间，包含检索、重排和生成等已启用步骤。",
  },
  {
    key: "providerCostProxy",
    label: "重排成本代理",
    kind: "cost",
    help: "用于比较重排服务资源消耗的估算值：优先采用计费输入 Token，否则按参与重排的候选文档数估算。它是整次运行的累计值，不是实际金额。",
  },
] as const

export function EvalComparePage() {
  const { datasetId = "" } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const dataset = useEvalDataset(datasetId)
  const runs = useEvalRuns(datasetId, { page: 1, pageSize: 100 })
  const runAId = searchParams.get("baseline") ?? ""
  const runBId = searchParams.get("candidate") ?? ""
  const [filter, setFilter] = useState<Filter>("all")
  const [detailChange, setDetailChange] =
    useState<EvalRunCompareQueryChange | null>(null)
  const compare = useEvalRunCompare(runAId, runBId, Boolean(runAId && runBId))
  const runAResult = useEvalRunResult(
    runAId,
    detailChange?.baseline.resultId ?? "",
    Boolean(detailChange?.baseline.resultId)
  )
  const runBResult = useEvalRunResult(
    runBId,
    detailChange?.candidate.resultId ?? "",
    Boolean(detailChange?.candidate.resultId)
  )
  const runOptions = useMemo(
    () =>
      (runs.data?.items ?? []).map((run) => ({
        value: run.id,
        label: `${evalRunTitle(run)} · ${policyName(run) ?? run.name ?? evalRunConfigSummary(run)} · ${formatEvalDateTime(run.createdAt)}`,
      })),
    [runs.data?.items]
  )

  function updateParam(key: "baseline" | "candidate", value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }
  function swapRuns() {
    const next = new URLSearchParams(searchParams)
    next.set("baseline", runBId)
    next.set("candidate", runAId)
    setSearchParams(next, { replace: true })
    setDetailChange(null)
  }
  const filteredChanges = useMemo(() => {
    const items = compare.data?.queryChanges ?? []
    return filter === "all"
      ? items
      : items.filter((item) => item.classification === filter)
  }, [compare.data?.queryChanges, filter])
  const counts = useMemo(() => {
    const items = compare.data?.queryChanges ?? []
    return {
      improved: items.filter((item) => item.classification === "improved")
        .length,
      regressed: items.filter((item) => item.classification === "regressed")
        .length,
      unchanged: items.filter((item) => item.classification === "unchanged")
        .length,
      incomparable: items.filter(
        (item) => item.classification === "incomparable"
      ).length,
    }
  }, [compare.data?.queryChanges])
  const columns = useMemo<Array<DataTableColumn<EvalRunCompareQueryChange>>>(
    () => [
      {
        key: "question",
        header: "问题",
        className: "w-[34%]",
        render: (row) => <span className="line-clamp-2">{row.question}</span>,
      },
      {
        key: "summary",
        header: "结果摘要",
        className: "w-[24%]",
        render: (row) => {
          const summary = buildQueryComparisonSummary(row)
          return (
            <div>
              <div className="font-medium">{summary.label}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {summary.detail}
              </div>
            </div>
          )
        },
      },
      {
        key: "recall",
        header: "Recall A → B",
        className: "w-[14%]",
        cellClassName: "tabular-nums",
        render: (row) => formatMetricTransition(row, "recallAtK"),
      },
      {
        key: "mrr",
        header: "MRR A → B",
        className: "w-[14%]",
        cellClassName: "tabular-nums",
        render: (row) => formatMetricTransition(row, "mrrAtK"),
      },
      {
        key: "actions",
        header: "差异详情",
        className: "w-[14%] text-center",
        cellClassName: "text-center",
        render: (row) => (
          <Button
            variant="outline"
            size="sm"
            disabled={!row.baseline.resultId && !row.candidate.resultId}
            onClick={() => setDetailChange(row)}
            aria-label="查看问题差异"
          >
            查看差异
          </Button>
        ),
      },
    ],
    []
  )
  const runA = compare.data?.baseline
  const runB = compare.data?.candidate

  return (
    <Page>
      <PageHeader
        items={[
          { label: "评测数据集", href: "/evals" },
          {
            label: dataset.data?.name || "数据集",
            href: `/evals/${datasetId}`,
          },
          { label: "运行对比" },
        ]}
        description="对比同一数据集中的两次历史运行。A/B 仅用于区分左右对象，不代表基线、候选或发布方向。"
      />
      <PageBody className="space-y-4">
        <RunSelectors
          runAId={runAId}
          runBId={runBId}
          options={runOptions}
          loading={runs.isLoading}
          onChangeA={(v) => updateParam("baseline", v)}
          onChangeB={(v) => updateParam("candidate", v)}
          onSwap={swapRuns}
        />
        {!runAId || !runBId ? (
          <Empty text="请选择同一数据集中的运行 A 与运行 B。" />
        ) : compare.isLoading ? (
          <div className="rounded-lg border border-border bg-card px-4 py-10">
            <LoadingText className="mx-auto">正在计算对比</LoadingText>
          </div>
        ) : compare.isError ? (
          <Empty
            text="对比失败，请确认两次运行属于同一数据集且均已完成。"
            error
          />
        ) : compare.data && runA && runB ? (
          <>
            <section className="grid gap-3 md:grid-cols-2">
              <RunIdentity label="运行 A" run={runA} />
              <RunIdentity label="运行 B" run={runB} />
            </section>
            <MetricComparison
              runA={runA}
              runB={runB}
              deltas={compare.data.metricDeltas}
            />
            <ConfigComparison runA={runA} runB={runB} />
            <EvalBehaviorComparePanel deltas={compare.data.behaviorDeltas} />
            <section className="space-y-2">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">逐题差异</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    B 较高 {counts.improved} · A 较高 {counts.regressed} ·
                    基本一致 {counts.unchanged} · 无法比较 {counts.incomparable}
                  </div>
                </div>
                <div className="w-44">
                  <Select
                    value={filter}
                    onValueChange={(v) => setFilter(v as Filter)}
                    options={[
                      { value: "all", label: "全部问题" },
                      { value: "improved", label: "B 较高" },
                      { value: "regressed", label: "A 较高" },
                      { value: "unchanged", label: "基本一致" },
                      { value: "incomparable", label: "无法比较" },
                    ]}
                  />
                </div>
              </div>
              <DataTable
                columns={columns}
                data={filteredChanges}
                getRowKey={(row) => row.queryId}
                emptyText="没有符合当前筛选条件的问题"
              />
              <EvalQuestionCompareDialog
                change={detailChange}
                runAName={displayRunName(runA)}
                runBName={displayRunName(runB)}
                runAResult={{
                  data: runAResult.data ?? null,
                  loading: runAResult.isLoading,
                  error: runAResult.isError,
                }}
                runBResult={{
                  data: runBResult.data ?? null,
                  loading: runBResult.isLoading,
                  error: runBResult.isError,
                }}
                onClose={() => setDetailChange(null)}
              />
            </section>
          </>
        ) : null}
      </PageBody>
    </Page>
  )
}

function RunSelectors({
  runAId,
  runBId,
  options,
  loading,
  onChangeA,
  onChangeB,
  onSwap,
}: {
  runAId: string
  runBId: string
  options: Array<{ value: string; label: string }>
  loading: boolean
  onChangeA: (value: string) => void
  onChangeB: (value: string) => void
  onSwap: () => void
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="grid items-end gap-3 md:grid-cols-[1fr_auto_1fr]">
        <div>
          <label className="mb-1.5 block text-sm font-medium">运行 A</label>
          <Select
            value={runAId}
            onValueChange={onChangeA}
            options={[{ value: "", label: "选择运行 A" }, ...options]}
            disabled={loading}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onSwap}
          disabled={!runAId || !runBId}
          aria-label="交换运行 A 和运行 B"
        >
          交换 A/B
        </Button>
        <div>
          <label className="mb-1.5 block text-sm font-medium">运行 B</label>
          <Select
            value={runBId}
            onValueChange={onChangeB}
            options={[{ value: "", label: "选择运行 B" }, ...options]}
            disabled={loading}
          />
        </div>
      </div>
    </section>
  )
}

function RunIdentity({ label, run }: { label: string; run: EvalRun }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 truncate text-base font-semibold">
            {displayRunName(run)}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {evalRunTitle(run)} · {evalRunConfigSummary(run)}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {formatEvalDateTime(run.createdAt)} · ID {evalRunShortId(run)}
          </div>
        </div>
        <Link
          to={`/evals/runs/${run.id}`}
          className="shrink-0 text-sm text-muted-foreground hover:underline"
        >
          打开详情
        </Link>
      </div>
    </div>
  )
}

function MetricComparison({
  runA,
  runB,
  deltas,
}: {
  runA: EvalRun
  runB: EvalRun
  deltas: Record<string, number | null>
}) {
  return (
    <section>
      <div className="mb-2">
        <div className="text-sm font-semibold">总体结果</div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          差值统一按 B − A 计算，仅描述数值变化。
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F1F5F9] text-[#17243D]">
            <tr>
              <th className="px-4 py-3 font-semibold">指标</th>
              <th className="px-4 py-3 font-semibold">运行 A</th>
              <th className="px-4 py-3 font-semibold">运行 B</th>
              <th className="px-4 py-3 font-semibold">B − A</th>
            </tr>
          </thead>
          <tbody>
            {METRIC_ROWS.map((row) => (
              <tr key={row.key} className="border-t border-border">
                <td className="px-4 py-2.5 font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    {row.label}
                    <Tooltip
                      content={row.help}
                      className="max-w-72 text-left leading-relaxed whitespace-normal"
                    >
                      <button
                        type="button"
                        className="rounded-full text-muted-foreground/70 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                        aria-label={`${row.label} 指标说明`}
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                  </span>
                </td>
                <td className="px-4 py-2.5 tabular-nums">
                  {formatMetricValue(runA.metrics[row.key], row.kind)}
                </td>
                <td className="px-4 py-2.5 tabular-nums">
                  {formatMetricValue(runB.metrics[row.key], row.kind)}
                </td>
                <td className="px-4 py-2.5 tabular-nums">
                  {formatDeltaValue(deltas[row.key], row.kind)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

type ConfigRow = { label: string; a: string; b: string }
function ConfigComparison({ runA, runB }: { runA: EvalRun; runB: EvalRun }) {
  const rows = buildConfigRows(runA, runB),
    changed = rows.filter((r) => r.a !== r.b),
    same = rows.filter((r) => r.a === r.b)
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="text-sm font-semibold">配置差异</div>
      <p className="mt-1 text-xs text-muted-foreground">
        优先展示运行前配置不同的项目；相同配置收起显示。
      </p>
      <div className="mt-3">
        {changed.length ? (
          <ConfigTable rows={changed} />
        ) : (
          <div className="rounded-md bg-muted/25 px-3 py-4 text-sm text-muted-foreground">
            两次运行的已记录配置相同。
          </div>
        )}
        {same.length ? (
          <details className="mt-3 rounded-md border border-border px-3 py-2.5">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              查看相同配置（{same.length} 项）
            </summary>
            <div className="mt-2">
              <ConfigTable rows={same} />
            </div>
          </details>
        ) : null}
      </div>
    </section>
  )
}
function ConfigTable({ rows }: { rows: ConfigRow[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="grid grid-cols-[1fr_1.4fr_1.4fr] bg-muted/40 text-xs font-medium text-muted-foreground">
        <div className="px-3 py-2">配置项</div>
        <div className="px-3 py-2">运行 A</div>
        <div className="px-3 py-2">运行 B</div>
      </div>
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[1fr_1.4fr_1.4fr] border-t border-border text-sm"
        >
          <div className="bg-muted/15 px-3 py-2 font-medium">{row.label}</div>
          <div className="px-3 py-2 break-words">{row.a}</div>
          <div className="border-l border-border px-3 py-2 break-words">
            {row.b}
          </div>
        </div>
      ))}
    </div>
  )
}

function buildConfigRows(a: EvalRun, b: EvalRun): ConfigRow[] {
  const ap = policySnapshot(a),
    bp = policySnapshot(b),
    ac = ap.config,
    bc = bp.config
  const fields: Array<{ label: string; a: unknown; b: unknown }> = [
    {
      label: "执行方式",
      a: evalExecutionModeLabel(a.executionMode),
      b: evalExecutionModeLabel(b.executionMode),
    },
    {
      label: "Agent 策略",
      a: ap.name ?? readSnapshot(a, "agentPolicyId"),
      b: bp.name ?? readSnapshot(b, "agentPolicyId"),
    },
    {
      label: "默认检索模式",
      a: evalRetrieverModeLabel(a.retrieverMode),
      b: evalRetrieverModeLabel(b.retrieverMode),
    },
    {
      label: "回答上下文 TopK",
      a: ac.answerContextTopK ?? ac.defaultTopK ?? a.topK,
      b: bc.answerContextTopK ?? bc.defaultTopK ?? b.topK,
    },
    { label: "生成答案", a: a.includeGeneration, b: b.includeGeneration },
    { label: "模型", a: readModel(a), b: readModel(b) },
    { label: "工具调用上限", a: ac.maxToolCalls, b: bc.maxToolCalls },
    { label: "Planner 调用上限", a: ac.maxPlannerCalls, b: bc.maxPlannerCalls },
    {
      label: "工具失败重试次数",
      a: ac.maxToolFailureRetries,
      b: bc.maxToolFailureRetries,
    },
    { label: "最低证据分数", a: ac.minEvidenceScore, b: bc.minEvidenceScore },
    {
      label: "Planner Prompt",
      a: ac.plannerPromptHash ?? readSnapshot(a, "plannerPromptHash"),
      b: bc.plannerPromptHash ?? readSnapshot(b, "plannerPromptHash"),
    },
    {
      label: "助手系统提示词",
      a: readAssistantField(a, "systemPromptHash"),
      b: readAssistantField(b, "systemPromptHash"),
    },
  ]
  return fields.map((f) => ({
    label: f.label,
    a: formatConfigValue(f.a),
    b: formatConfigValue(f.b),
  }))
}
function policySnapshot(run: EvalRun): {
  name: string | null
  config: AgentPolicyConfig
} {
  const value = run.configSnapshot?.agentPolicySnapshot
  if (!value || typeof value !== "object") return { name: null, config: {} }
  const snapshot = value as Record<string, unknown>
  return {
    name: typeof snapshot.name === "string" ? snapshot.name : null,
    config:
      snapshot.config && typeof snapshot.config === "object"
        ? (snapshot.config as AgentPolicyConfig)
        : {},
  }
}
function policyName(run: EvalRun) {
  return policySnapshot(run).name
}
function displayRunName(run: EvalRun) {
  return policyName(run) ?? run.name ?? evalRunTitle(run)
}
function readSnapshot(run: EvalRun, key: string) {
  return run.configSnapshot?.[key]
}
function readAssistantField(run: EvalRun, key: string) {
  const a = run.configSnapshot?.assistant
  return a && typeof a === "object"
    ? (a as Record<string, unknown>)[key]
    : undefined
}
function readModel(run: EvalRun) {
  return readSnapshot(run, "model") ?? readAssistantField(run, "model")
}
function formatConfigValue(value: unknown) {
  if (value === undefined || value === null || value === "") return "-"
  if (typeof value === "boolean") return value ? "启用" : "关闭"
  if (Array.isArray(value)) return value.length ? value.join("、") : "-"
  return String(value)
}
function formatMetricTransition(row: EvalRunCompareQueryChange, key: string) {
  return `${formatMetricNumber(row.baseline.metrics?.[key])} → ${formatMetricNumber(row.candidate.metrics?.[key])}`
}
function formatMetricValue(value: unknown, kind: string) {
  if (kind === "latency") return formatLatencyMs(value)
  if (kind === "cost") return formatMetricNumber(value, 2)
  return formatMetricNumber(value)
}
function formatDeltaValue(value: number | null | undefined, kind: string) {
  if (kind === "latency")
    return typeof value === "number" && Number.isFinite(value)
      ? `${value > 0 ? "+" : ""}${formatLatencyMs(value)}`
      : "-"
  return formatSignedMetricDelta(value, kind === "cost" ? 2 : 3)
}
function Empty({ text, error }: { text: string; error?: boolean }) {
  return (
    <div
      className={`rounded-lg border ${error ? "border-border bg-card text-destructive" : "border-dashed text-muted-foreground"} px-4 py-12 text-center text-sm`}
    >
      {text}
    </div>
  )
}
