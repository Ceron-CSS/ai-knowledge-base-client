import { formatDistribution, type BehaviorDeltas } from "@/features/evals/lib/decisionMetrics"
import { cn } from "@/lib/utils"

type EvalBehaviorComparePanelProps = {
  deltas: BehaviorDeltas | null | undefined
}

export function EvalBehaviorComparePanel({ deltas }: EvalBehaviorComparePanelProps) {
  if (!deltas) {
    return (
      <section className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
        两次运行缺少决策行为指标，无法对比策略行为变化。
      </section>
    )
  }

  const rates = deltas.rates
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="text-sm font-medium">策略行为变化</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <RateDelta label="二次检索率" value={rates.multiPassRate} />
        <RateDelta label="Rerank 触发率" value={rates.rerankRate} />
        <RateDelta label="扩上下文率" value={rates.contextExpandRate} />
        <RateDelta label="证据校验率" value={rates.evidenceVerifiedRate} />
        <RateDelta label="证据充分率" value={rates.evidenceSufficientRate} positiveGood />
        <RateDelta label="平均工具调用" value={rates.avgToolCallCount} isCount />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-border/70 px-3 py-2 text-sm">
          <div className="text-xs text-muted-foreground">检索模式（基线 → 候选）</div>
          <div className="mt-1">
            {formatDistribution(deltas.baselineModeDistribution)} →{" "}
            {formatDistribution(deltas.candidateModeDistribution)}
          </div>
        </div>
        <div className="rounded-md border border-border/70 px-3 py-2 text-sm">
          <div className="text-xs text-muted-foreground">TopK（基线 → 候选）</div>
          <div className="mt-1">
            {formatDistribution(deltas.baselineTopKDistribution)} →{" "}
            {formatDistribution(deltas.candidateTopKDistribution)}
          </div>
        </div>
      </div>
    </section>
  )
}

function RateDelta({
  label,
  value,
  positiveGood = false,
  isCount = false,
}: {
  label: string
  value: number | null | undefined
  positiveGood?: boolean
  isCount?: boolean
}) {
  let text = "-"
  if (typeof value === "number" && Number.isFinite(value)) {
    const sign = value > 0 ? "+" : ""
    text = isCount ? `${sign}${value.toFixed(2)}` : `${sign}${(value * 100).toFixed(1)}%`
  }
  const tone =
    typeof value !== "number" || !Number.isFinite(value) || value === 0
      ? "text-foreground"
      : value > 0
        ? positiveGood
          ? "text-emerald-700"
          : "text-amber-700"
        : positiveGood
          ? "text-amber-700"
          : "text-emerald-700"

  return (
    <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-lg font-semibold tabular-nums", tone)}>{text}</div>
    </div>
  )
}
