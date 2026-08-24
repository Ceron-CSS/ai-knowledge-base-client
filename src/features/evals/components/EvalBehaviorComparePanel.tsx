import {
  formatDecisionMode,
  type BehaviorDeltas,
} from "@/features/evals/lib/decisionMetrics"

type EvalBehaviorComparePanelProps = {
  deltas: BehaviorDeltas | null | undefined
}

const RATE_FIELDS = [
  { key: "multiPassRate", label: "二次检索率", count: false },
  { key: "rerankRate", label: "Rerank 触发率", count: false },
  { key: "contextExpandRate", label: "扩展上下文率", count: false },
  { key: "evidenceVerifiedRate", label: "证据校验率", count: false },
  { key: "evidenceSufficientRate", label: "证据充分率", count: false },
  { key: "avgToolCallCount", label: "平均工具调用", count: true },
] as const

export function EvalBehaviorComparePanel({
  deltas,
}: EvalBehaviorComparePanelProps) {
  if (!deltas) return null

  const rateChanges = RATE_FIELDS.flatMap((field) => {
    const value = deltas.rates[field.key]
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      Math.abs(value) <= 1e-9
    ) {
      return []
    }
    return [{ ...field, value }]
  })
  const modeChanged = !sameDistribution(
    deltas.baselineModeDistribution,
    deltas.candidateModeDistribution
  )
  const topKChanged = !sameDistribution(
    deltas.baselineTopKDistribution,
    deltas.candidateTopKDistribution
  )
  const hasChanges = rateChanges.length > 0 || modeChanged || topKChanged

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div>
        <div className="text-sm font-medium">实际执行行为</div>
        <p className="mt-1 text-xs text-muted-foreground">
          展示这批问题运行时真正采用的检索和工具行为，不代表配置本身，也不自动判断好坏。
        </p>
      </div>

      {!hasChanges ? (
        <div className="mt-3 rounded-md bg-muted/25 px-3 py-4 text-sm text-muted-foreground">
          两次运行的实际执行行为无明显差异。
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {rateChanges.length ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {rateChanges.map((field) => (
                <div
                  key={field.key}
                  className="rounded-md border border-border bg-muted/15 px-3 py-2.5"
                >
                  <div className="text-xs text-muted-foreground">
                    {field.label}（B − A）
                  </div>
                  <div className="mt-1 text-base font-semibold tabular-nums">
                    {formatBehaviorDelta(field.value, field.count)}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {modeChanged || topKChanged ? (
            <div className="grid gap-3 md:grid-cols-2">
              {modeChanged ? (
                <DistributionDiff
                  title="检索模式分布"
                  a={deltas.baselineModeDistribution}
                  b={deltas.candidateModeDistribution}
                  formatKey={formatDecisionMode}
                />
              ) : null}
              {topKChanged ? (
                <DistributionDiff
                  title="最终 TopK 分布"
                  a={deltas.baselineTopKDistribution}
                  b={deltas.candidateTopKDistribution}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

function DistributionDiff({
  title,
  a,
  b,
  formatKey = (key) => key,
}: {
  title: string
  a: Record<string, number>
  b: Record<string, number>
  formatKey?: (key: string) => string
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">运行 A</div>
          <div className="mt-1 leading-6">
            {formatDistributionWithTotal(a, formatKey)}
          </div>
        </div>
        <div className="border-l border-border pl-3">
          <div className="text-xs text-muted-foreground">运行 B</div>
          <div className="mt-1 leading-6">
            {formatDistributionWithTotal(b, formatKey)}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDistributionWithTotal(
  distribution: Record<string, number>,
  formatKey: (key: string) => string
) {
  const entries = Object.entries(distribution)
  if (!entries.length) return "-"
  const total = entries.reduce((sum, [, count]) => sum + count, 0)
  return entries
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
    )
    .map(([key, count]) => `${formatKey(key)}：${count}/${total} 题`)
    .join(" · ")
}

function sameDistribution(
  a: Record<string, number>,
  b: Record<string, number>
) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].every((key) => (a[key] ?? 0) === (b[key] ?? 0))
}

function formatBehaviorDelta(value: number, isCount: boolean) {
  const sign = value > 0 ? "+" : ""
  return isCount
    ? `${sign}${value.toFixed(2)} 次`
    : `${sign}${(value * 100).toFixed(1)}%`
}
