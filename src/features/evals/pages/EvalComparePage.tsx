import { useMemo, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { History, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { LoadingText } from "@/components/ui/loading-text"
import { Page, PageBody, PageHeader } from "@/components/ui/page-header"
import { Select } from "@/components/ui/select"
import type { EvalRunCompareQueryChange } from "@/api/evals"
import { EvalAgentPolicyPanel } from "@/features/evals/components/EvalAgentPolicyPanel"
import { EvalBehaviorComparePanel } from "@/features/evals/components/EvalBehaviorComparePanel"
import {
  useEvalDataset,
  useEvalRunCompare,
  useEvalRuns,
} from "@/features/evals/hooks/queries"
import { formatModes, readDecisionSummary } from "@/features/evals/lib/decisionMetrics"
import { formatEvalDateTime } from "@/features/evals/lib/formatDate"
import {
  evalExecutionModeLabel,
  evalRetrieverModeLabel,
  formatMetricNumber,
} from "@/features/evals/lib/labels"
import { buildReleaseConclusion, classificationLabel } from "@/features/evals/lib/comparePresentation"
import { cn } from "@/lib/utils"

function formatSignedDelta(value: number | null | undefined, digits = 3) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(digits)}`
}

function formatSignedLatency(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-"
  const sign = value > 0 ? "+" : ""
  if (Math.abs(value) < 1000) return `${sign}${Math.round(value)} ms`
  return `${sign}${(value / 1000).toFixed(1)} 秒`
}

export function EvalComparePage() {
  const { datasetId = "" } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const dataset = useEvalDataset(datasetId)
  const runs = useEvalRuns(datasetId, { page: 1, pageSize: 100 })

  const baselineId = searchParams.get("baseline") ?? ""
  const candidateId = searchParams.get("candidate") ?? ""
  const [filter, setFilter] = useState<"all" | "improved" | "regressed" | "unchanged" | "incomparable">(
    "all",
  )

  const compare = useEvalRunCompare(baselineId, candidateId, Boolean(baselineId && candidateId))

  const runOptions = useMemo(
    () =>
      (runs.data?.items ?? []).map((run) => ({
        value: run.id,
        label: `${run.name || run.id.slice(0, 8)} · ${formatEvalDateTime(run.createdAt)}`,
      })),
    [runs.data?.items],
  )

  function updateParam(key: "baseline" | "candidate", value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  const filteredChanges = useMemo(() => {
    const items = compare.data?.queryChanges ?? []
    if (filter === "all") return items
    return items.filter((item) => item.classification === filter)
  }, [compare.data?.queryChanges, filter])

  const counts = useMemo(() => {
    const items = compare.data?.queryChanges ?? []
    return {
      improved: items.filter((i) => i.classification === "improved").length,
      regressed: items.filter((i) => i.classification === "regressed").length,
      unchanged: items.filter((i) => i.classification === "unchanged").length,
      incomparable: items.filter((i) => i.classification === "incomparable").length,
    }
  }, [compare.data?.queryChanges])

  const columns = useMemo<Array<DataTableColumn<EvalRunCompareQueryChange>>>(
    () => [
      {
        key: "question",
        header: "问题",
        render: (row) => <span className="line-clamp-2 max-w-[320px]">{row.question}</span>,
      },
      {
        key: "classification",
        header: "变化",
        render: (row) => (
          <span
            className={cn(
              "text-sm font-medium",
              row.classification === "improved" && "text-emerald-700",
              row.classification === "regressed" && "text-destructive",
            )}
          >
            {classificationLabel(row.classification)}
          </span>
        ),
      },
      {
        key: "baselineRecall",
        header: "基线 Recall",
        cellClassName: "tabular-nums",
        render: (row) => formatMetricNumber(row.baseline.metrics?.recallAtK),
      },
      {
        key: "candidateRecall",
        header: "候选 Recall",
        cellClassName: "tabular-nums",
        render: (row) => formatMetricNumber(row.candidate.metrics?.recallAtK),
      },
      {
        key: "baselineMrr",
        header: "基线 MRR",
        cellClassName: "tabular-nums",
        render: (row) => formatMetricNumber(row.baseline.metrics?.mrrAtK),
      },
      {
        key: "candidateMrr",
        header: "候选 MRR",
        cellClassName: "tabular-nums",
        render: (row) => formatMetricNumber(row.candidate.metrics?.mrrAtK),
      },
      {
        key: "behavior",
        header: "决策变化",
        render: (row) => {
          const baselineModes = readDecisionSummary(row.baseline.metrics ?? undefined)?.selectedModes
          const candidateModes = readDecisionSummary(row.candidate.metrics ?? undefined)?.selectedModes
          if (!baselineModes?.length && !candidateModes?.length) return "-"
          return (
            <span className="line-clamp-2 max-w-[200px] text-xs text-muted-foreground">
              {formatModes(baselineModes)} → {formatModes(candidateModes)}
            </span>
          )
        },
      },
      {
        key: "actions",
        header: "操作",
        className: "w-[10%] text-center",
        cellClassName: "text-center",
        render: (row) => (
          <div className="inline-flex items-center justify-center gap-0.5 whitespace-nowrap">
            {row.baseline.resultId ? (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-foreground/80 hover:bg-primary/10 hover:text-primary"
                onClick={() => navigate(`/evals/runs/${baselineId}?result=${row.baseline.resultId}`)}
                title="看基线"
                aria-label="看基线"
              >
                <History />
              </Button>
            ) : null}
            {row.candidate.resultId ? (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-foreground/80 hover:bg-primary/10 hover:text-primary"
                onClick={() => navigate(`/evals/runs/${candidateId}?result=${row.candidate.resultId}`)}
                title="看候选"
                aria-label="看候选"
              >
                <Sparkles />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [baselineId, candidateId, navigate],
  )

  const deltas = compare.data?.metricDeltas
  const baseline = compare.data?.baseline
  const candidate = compare.data?.candidate

  return (
    <Page>
      <PageHeader
        items={[
          { label: "评测与策略", href: "/evals" },
          { label: dataset.data?.name || "数据集", href: `/evals/${datasetId}` },
          { label: "运行对比" },
        ]}
        description="比较同数据集两次运行的指标 Delta 与逐问题改善/回归；质量提升时请同时关注延迟权衡"
      />

      <PageBody className="space-y-4">
        <section className="grid gap-3 rounded-lg border border-border bg-card p-4 shadow-sm md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">基线 Run</label>
            <Select
              value={baselineId}
              onValueChange={(value) => updateParam("baseline", value)}
              options={[{ value: "", label: "选择基线" }, ...runOptions]}
              disabled={runs.isLoading}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">候选 Run</label>
            <Select
              value={candidateId}
              onValueChange={(value) => updateParam("candidate", value)}
              options={[{ value: "", label: "选择候选" }, ...runOptions]}
              disabled={runs.isLoading}
            />
          </div>
        </section>

        {!baselineId || !candidateId ? (
          <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
            请选择同一数据集中的基线与候选运行
          </div>
        ) : compare.isLoading ? (
          <div className="rounded-lg border border-border bg-card px-4 py-10">
            <LoadingText className="mx-auto">对比计算中</LoadingText>
          </div>
        ) : compare.isError ? (
          <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-destructive">
            对比失败：请确认两次运行属于同一数据集且均已完成
          </div>
        ) : compare.data && baseline && candidate && deltas ? (
          <>
            <ConclusionBanner
              conclusion={buildReleaseConclusion(counts)}
              counts={counts}
              onShowRegressed={() => setFilter("regressed")}
              onShowImproved={() => setFilter("improved")}
            />

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <DeltaCard label="Recall@K" value={formatSignedDelta(deltas.recallAtK)} positiveGood />
              <DeltaCard label="Precision@K" value={formatSignedDelta(deltas.precisionAtK)} positiveGood />
              <DeltaCard label="Hit@K" value={formatSignedDelta(deltas.hitAtK)} positiveGood />
              <DeltaCard label="MRR@K" value={formatSignedDelta(deltas.mrrAtK)} positiveGood />
              <DeltaCard label="NDCG@K" value={formatSignedDelta(deltas.ndcgAtK)} positiveGood />
              <DeltaCard
                label="延迟"
                value={formatSignedLatency(deltas.latencyMs)}
                positiveGood={false}
                hint="数值上升表示变慢"
              />
              <DeltaCard
                label="成本代理"
                value={formatSignedDelta(deltas.providerCostProxy, 2)}
                positiveGood={false}
              />
            </section>

            <section className="grid gap-3 md:grid-cols-2">
              <ConfigSummary title="基线配置" run={baseline} href={`/evals/runs/${baseline.id}`} />
              <ConfigSummary title="候选配置" run={candidate} href={`/evals/runs/${candidate.id}`} />
            </section>

            <EvalBehaviorComparePanel deltas={compare.data.behaviorDeltas} />

            {(candidate.executionMode === "agent" || candidate.executionMode === "auto") &&
            (candidate.status === "succeeded" || candidate.status === "partial") ? (
              <EvalAgentPolicyPanel
                compact
                highlightPolicyId={
                  typeof candidate.configSnapshot?.agentPolicyId === "string"
                    ? candidate.configSnapshot.agentPolicyId
                    : null
                }
                evidenceEvalRunId={candidate.id}
              />
            ) : null}

            <section className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-medium">
                  问题变化
                  <span className="ml-2 font-normal text-muted-foreground">
                  改善 {counts.improved} · 回归 {counts.regressed} · 不变 {counts.unchanged} · 不可比{" "}
                  {counts.incomparable}
                  </span>
                </div>
                <div className="w-44">
                  <Select
                    value={filter}
                    onValueChange={(value) => setFilter(value as typeof filter)}
                    options={[
                      { value: "all", label: "全部问题" },
                      { value: "improved", label: "仅改善" },
                      { value: "regressed", label: "仅回归" },
                      { value: "unchanged", label: "仅不变" },
                      { value: "incomparable", label: "仅不可比" },
                    ]}
                  />
                </div>
              </div>
              <DataTable
                columns={columns}
                data={filteredChanges}
                getRowKey={(row) => row.queryId}
                emptyText="没有匹配的问题变化"
              />
            </section>
          </>
        ) : null}
      </PageBody>
    </Page>
  )
}

function ConclusionBanner({
  conclusion,
  counts,
  onShowRegressed,
  onShowImproved,
}: {
  conclusion: ReturnType<typeof buildReleaseConclusion>
  counts: {
    improved: number
    regressed: number
    unchanged: number
    incomparable: number
  }
  onShowRegressed: () => void
  onShowImproved: () => void
}) {
  return (
    <section
      className={cn(
        "rounded-lg border p-4 shadow-sm",
        conclusion.tone === "risk" && "border-destructive/30 bg-destructive/5",
        conclusion.tone === "ready" && "border-emerald-300 bg-emerald-50 text-emerald-950",
        conclusion.tone === "neutral" && "border-border bg-card",
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-semibold">{conclusion.title}</div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            {conclusion.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {counts.regressed > 0 ? (
            <Button variant="outline" size="sm" onClick={onShowRegressed}>
              查看回归问题
            </Button>
          ) : null}
          {counts.improved > 0 ? (
            <Button variant="outline" size="sm" onClick={onShowImproved}>
              查看改善问题
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function DeltaCard({
  label,
  value,
  positiveGood,
  hint,
}: {
  label: string
  value: string
  positiveGood: boolean
  hint?: string
}) {
  const numeric = Number(value.replace("+", ""))
  const tone =
    value === "-" || !Number.isFinite(numeric) || numeric === 0
      ? "text-foreground"
      : numeric > 0
        ? positiveGood
          ? "text-emerald-700"
          : "text-destructive"
        : positiveGood
          ? "text-destructive"
          : "text-emerald-700"

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("mt-2 text-xl font-semibold tabular-nums", tone)}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  )
}

function ConfigSummary({
  title,
  run,
  href,
}: {
  title: string
  run: {
    id: string
    name: string | null
    executionMode: string
    retrieverMode: string
    topK: number
    includeGeneration: boolean
    configSnapshot?: Record<string, unknown> | null
  }
  href: string
}) {
  const policyId =
    typeof run.configSnapshot?.agentPolicyId === "string" ? run.configSnapshot.agentPolicyId : null
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">{title}</div>
        <Link to={href} className="text-sm text-muted-foreground hover:underline">
          打开详情
        </Link>
      </div>
      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
        <div>{run.name || run.id.slice(0, 8)}</div>
        <div>
          {evalExecutionModeLabel(run.executionMode)} · {evalRetrieverModeLabel(run.retrieverMode)} ·
          Top K={run.topK}
        </div>
        <div>{run.includeGeneration ? "含生成" : "仅检索"}</div>
        <div>Policy：{policyId || "-"}</div>
      </div>
    </div>
  )
}
