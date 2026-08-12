import {
  formatDistribution,
  formatRate,
  type DecisionMetrics,
} from "@/features/evals/lib/decisionMetrics"

type EvalDecisionBehaviorPanelProps = {
  metrics: DecisionMetrics | null
  title?: string
}

export function EvalDecisionBehaviorPanel({
  metrics,
  title = "Agent 决策行为",
}: EvalDecisionBehaviorPanelProps) {
  if (!metrics) {
    return (
      <section className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
        当前运行没有决策摘要（仅检索 / Workflow 固定流程不会产生 Agent 行为分布）。
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">样本 {metrics.sampleCount}</div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="二次检索率" value={formatRate(metrics.multiPassRate)} />
        <Stat label="Rerank 触发率" value={formatRate(metrics.rerankRate)} />
        <Stat label="扩上下文率" value={formatRate(metrics.contextExpandRate)} />
        <Stat label="证据校验率" value={formatRate(metrics.evidenceVerifiedRate)} />
        <Stat label="证据充分率" value={formatRate(metrics.evidenceSufficientRate)} />
        <Stat
          label="平均工具调用"
          value={
            typeof metrics.avgToolCallCount === "number"
              ? metrics.avgToolCallCount.toFixed(2)
              : "-"
          }
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <DistributionCard label="检索模式分布" value={formatDistribution(metrics.modeDistribution)} />
        <DistributionCard label="TopK 分布" value={formatDistribution(metrics.topKDistribution)} />
        <DistributionCard
          label="问题类型分布"
          value={formatDistribution(metrics.queryTypeDistribution)}
        />
        <DistributionCard
          label="停止原因分布"
          value={formatDistribution(metrics.stopReasonDistribution)}
        />
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function DistributionCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 px-3 py-2 text-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-foreground/90">{value}</div>
    </div>
  )
}
