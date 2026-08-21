import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  formatDecisionMode,
  formatDistribution,
  formatQueryType,
  formatRate,
  formatStopReason,
  type DecisionMetrics,
} from "@/features/evals/lib/decisionMetrics"

type EvalDecisionBehaviorPanelProps = {
  metrics: DecisionMetrics | null
  title?: string
  description?: string
}

export function EvalDecisionBehaviorPanel({
  metrics,
  title = "检索决策摘要",
  description = "用于检查每道题实际走了哪些检索/排序步骤，以及是否因为证据不足触发补救动作。",
}: EvalDecisionBehaviorPanelProps) {
  const [expanded, setExpanded] = useState(false)

  if (!metrics) {
    return null
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{description}</div>
          <div className="mt-2 text-xs text-muted-foreground">
            样本 {metrics.sampleCount} · 二次检索 {formatRate(metrics.multiPassRate)} · 重排{" "}
            {formatRate(metrics.rerankRate)} · 证据充分 {formatRate(metrics.evidenceSufficientRate)}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown /> : <ChevronRight />}
          {expanded ? "收起" : "展开诊断"}
        </Button>
      </div>

      {expanded ? (
        <>
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
            <DistributionCard
              label="检索模式分布"
              value={formatDistribution(metrics.modeDistribution, formatDecisionMode)}
            />
            <DistributionCard
              label="TopK 分布"
              value={formatDistribution(metrics.topKDistribution, (key) => `K=${key}`)}
            />
            <DistributionCard
              label="问题类型分布"
              value={formatDistribution(metrics.queryTypeDistribution, formatQueryType)}
            />
            <DistributionCard
              label="停止原因分布"
              value={formatDistribution(metrics.stopReasonDistribution, formatStopReason)}
            />
          </div>
        </>
      ) : null}
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
