import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { LoadingText } from "@/components/ui/loading-text"
import type {
  EvalRunCompareQueryChange,
  EvalRunResultDetail,
} from "@/api/evals"
import { ChunkRefList } from "@/features/evals/components/ChunkRefList"
import { useChunkHits } from "@/features/evals/hooks/useChunkHits"
import {
  formatModes,
  readDecisionSummary,
} from "@/features/evals/lib/decisionMetrics"
import {
  formatLatencyMs,
  formatMetricNumber,
} from "@/features/evals/lib/labels"
import {
  buildQueryComparisonSummary,
  formatSignedMetricDelta,
} from "@/features/evals/lib/comparePresentation"

type ResultState = {
  data: EvalRunResultDetail | null
  loading: boolean
  error: boolean
}

type Props = {
  change: EvalRunCompareQueryChange | null
  runAName: string
  runBName: string
  runAResult: ResultState
  runBResult: ResultState
  onClose: () => void
}

const METRICS = [
  { key: "recallAtK", label: "Recall@K" },
  { key: "precisionAtK", label: "Precision@K" },
  { key: "hitAtK", label: "Hit@K" },
  { key: "mrrAtK", label: "MRR@K" },
  { key: "ndcgAtK", label: "NDCG@K" },
] as const

export function EvalQuestionCompareDialog({
  change,
  runAName,
  runBName,
  runAResult,
  runBResult,
  onClose,
}: Props) {
  const allChunkIds = [
    ...(runAResult.data?.retrievedChunkIds ?? []),
    ...(runAResult.data?.relevantChunkIds ?? []),
    ...(runBResult.data?.retrievedChunkIds ?? []),
    ...(runBResult.data?.relevantChunkIds ?? []),
  ]
  const chunkHits = useChunkHits(allChunkIds)

  if (!change) return null

  const summary = buildQueryComparisonSummary(change)
  const aIds = runAResult.data?.retrievedChunkIds ?? []
  const bIds = runBResult.data?.retrievedChunkIds ?? []
  const aSet = new Set(aIds)
  const bSet = new Set(bIds)
  const common = aIds.filter((id) => bSet.has(id))
  const onlyA = aIds.filter((id) => !bSet.has(id))
  const onlyB = bIds.filter((id) => !aSet.has(id))
  const rankChanges = common
    .map((id) => ({ id, a: aIds.indexOf(id) + 1, b: bIds.indexOf(id) + 1 }))
    .filter((item) => item.a !== item.b)
  const answersDiffer =
    runAResult.data?.generatedAnswer !== runBResult.data?.generatedAnswer &&
    Boolean(
      runAResult.data?.generatedAnswer || runBResult.data?.generatedAnswer
    )

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="问题差异"
      description={change.question}
      contentClassName="max-w-5xl"
      bodyClassName="max-h-[min(76vh,760px)] overflow-y-auto pr-1"
      footer={
        <Button variant="dialog-cancel" size="dialog" onClick={onClose}>
          关闭
        </Button>
      }
    >
      <div className="space-y-4">
        <section className="rounded-lg border border-border bg-muted/20 p-4">
          <div className="text-sm font-semibold">{summary.label}</div>
          <p className="mt-1 text-sm text-muted-foreground">{summary.detail}</p>
        </section>

        <DetailLoadingState a={runAResult} b={runBResult} />

        <section>
          <SectionTitle
            title="指标差异"
            description="差值统一按 B − A 计算。"
          />
          <div className="mt-2 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 font-medium">指标</th>
                  <th className="px-3 py-2 font-medium">运行 A</th>
                  <th className="px-3 py-2 font-medium">运行 B</th>
                  <th className="px-3 py-2 font-medium">B − A</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map((metric) => {
                  const a = readMetric(change.baseline.metrics?.[metric.key])
                  const b = readMetric(change.candidate.metrics?.[metric.key])
                  return (
                    <tr key={metric.key} className="border-t border-border">
                      <td className="px-3 py-2">{metric.label}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {formatMetricNumber(a)}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {formatMetricNumber(b)}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {a === null || b === null
                          ? "-"
                          : formatSignedMetricDelta(b - a)}
                      </td>
                    </tr>
                  )
                })}
                <tr className="border-t border-border">
                  <td className="px-3 py-2">耗时</td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatLatencyMs(runAResult.data?.durationMs ?? null)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatLatencyMs(runBResult.data?.durationMs ?? null)}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatLatencyDelta(
                      runAResult.data?.durationMs,
                      runBResult.data?.durationMs
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <ExecutionDiff a={runAResult.data} b={runBResult.data} />

        {(runAResult.data || runBResult.data) && (
          <section>
            <SectionTitle
              title="召回结果差异"
              description="按共同召回、单侧召回和排名变化拆分，便于定位指标变化原因。"
            />
            <div className="mt-2 grid gap-3 lg:grid-cols-3">
              <ChunkGroup
                title={`共同召回 · ${common.length}`}
                ids={common}
                chunkHits={chunkHits}
              />
              <ChunkGroup
                title={`仅运行 A · ${onlyA.length}`}
                ids={onlyA}
                chunkHits={chunkHits}
              />
              <ChunkGroup
                title={`仅运行 B · ${onlyB.length}`}
                ids={onlyB}
                chunkHits={chunkHits}
              />
            </div>
            {rankChanges.length ? (
              <div className="mt-3 rounded-lg border border-border p-3 text-sm">
                <div className="text-xs font-medium text-muted-foreground">
                  共同 Chunk 排名变化
                </div>
                <div className="mt-2 space-y-1">
                  {rankChanges.map((item) => (
                    <div key={item.id} className="flex justify-between gap-3">
                      <span className="truncate font-mono text-xs">
                        {item.id}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        第 {item.a} 位 → 第 {item.b} 位
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        )}

        {answersDiffer ? (
          <section>
            <SectionTitle title="生成答案差异" />
            <div className="mt-2 grid gap-3 lg:grid-cols-2">
              <AnswerCard
                title={`运行 A · ${runAName}`}
                value={runAResult.data?.generatedAnswer}
              />
              <AnswerCard
                title={`运行 B · ${runBName}`}
                value={runBResult.data?.generatedAnswer}
              />
            </div>
          </section>
        ) : null}

        <details className="rounded-lg border border-border px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium">
            查看完整原始结果
          </summary>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <RawResult
              title={`运行 A · ${runAName}`}
              result={runAResult.data}
            />
            <RawResult
              title={`运行 B · ${runBName}`}
              result={runBResult.data}
            />
          </div>
        </details>
      </div>
    </Dialog>
  )
}

function DetailLoadingState({ a, b }: { a: ResultState; b: ResultState }) {
  if (a.loading || b.loading)
    return <LoadingText className="py-6">加载问题结果</LoadingText>
  if (a.error || b.error) {
    return (
      <div className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">
        部分结果加载失败，仍可查看已有指标。
      </div>
    )
  }
  return null
}

function ExecutionDiff({
  a,
  b,
}: {
  a: EvalRunResultDetail | null
  b: EvalRunResultDetail | null
}) {
  const left = readDecisionSummary(a?.metrics)
  const right = readDecisionSummary(b?.metrics)
  if (!left && !right) return null

  const rows = [
    {
      label: "检索路径",
      a: formatModes(left?.selectedModes),
      b: formatModes(right?.selectedModes),
    },
    {
      label: "初始 TopK",
      a: formatPlain(left?.initialTopK),
      b: formatPlain(right?.initialTopK),
    },
    {
      label: "最终 TopK",
      a: formatPlain(left?.finalTopK),
      b: formatPlain(right?.finalTopK),
    },
    {
      label: "检索轮次",
      a: formatPlain(left?.retrievalPasses),
      b: formatPlain(right?.retrievalPasses),
    },
    {
      label: "Rerank",
      a: formatBoolean(left?.rerankUsed),
      b: formatBoolean(right?.rerankUsed),
    },
    {
      label: "扩展上下文",
      a: formatBoolean(left?.contextExpanded),
      b: formatBoolean(right?.contextExpanded),
    },
    {
      label: "证据校验",
      a: formatBoolean(left?.evidenceVerified),
      b: formatBoolean(right?.evidenceVerified),
    },
  ].filter((row) => row.a !== row.b)

  if (!rows.length) return null
  return (
    <section>
      <SectionTitle
        title="执行过程差异"
        description="只展示本题实际执行中发生变化的项目。"
      />
      <div className="mt-2 overflow-hidden rounded-lg border border-border">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_1.5fr_1.5fr] border-t border-border first:border-t-0"
          >
            <div className="bg-muted/30 px-3 py-2 text-sm font-medium">
              {row.label}
            </div>
            <div className="px-3 py-2 text-sm">{row.a}</div>
            <div className="border-l border-border px-3 py-2 text-sm">
              {row.b}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ChunkGroup({
  title,
  ids,
  chunkHits,
}: {
  title: string
  ids: string[]
  chunkHits: ReturnType<typeof useChunkHits>
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        {title}
      </div>
      {ids.length ? (
        <ChunkRefList
          chunkIds={ids}
          hitByChunkId={chunkHits.hitByChunkId}
          loading={chunkHits.isFetching}
        />
      ) : (
        <div className="text-sm text-muted-foreground">无</div>
      )}
    </div>
  )
}

function AnswerCard({
  title,
  value,
}: {
  title: string
  value: string | null | undefined
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <div className="mt-2 text-sm leading-6 break-words whitespace-pre-wrap">
        {value || "-"}
      </div>
    </div>
  )
}

function RawResult({
  title,
  result,
}: {
  title: string
  result: EvalRunResultDetail | null
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">
        {title}
      </div>
      <pre className="max-h-80 overflow-auto rounded-md bg-muted/30 p-3 text-xs break-words whitespace-pre-wrap">
        {result ? JSON.stringify(result, null, 2) : "无结果"}
      </pre>
    </div>
  )
}

function SectionTitle({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div>
      <div className="text-sm font-semibold">{title}</div>
      {description ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}

function readMetric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function formatLatencyDelta(
  a: number | null | undefined,
  b: number | null | undefined
) {
  if (typeof a !== "number" || typeof b !== "number") return "-"
  const delta = b - a
  return `${delta > 0 ? "+" : ""}${formatLatencyMs(delta)}`
}

function formatPlain(value: unknown) {
  return value === undefined || value === null ? "-" : String(value)
}

function formatBoolean(value: boolean | undefined) {
  if (value === undefined) return "-"
  return value ? "是" : "否"
}
