import { Activity, ArrowRight, CheckCircle2, FlaskConical, GitCompare, Shield } from "lucide-react"
import { Link } from "react-router-dom"
import type { DashboardStats } from "@/api/stats"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type StrategyWorkbenchSectionProps = {
  data?: DashboardStats
}

const loopSteps = [
  "标注问题",
  "运行 baseline",
  "验证 candidate",
  "下钻 Trace",
  "发布策略",
] as const

export function StrategyWorkbenchSection({ data }: StrategyWorkbenchSectionProps) {
  const hasKnowledge = Boolean(data && data.kbCount.enabled > 0 && data.itemCount > 0)

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="relative min-h-[320px] p-5 sm:p-7">
          <div className="pointer-events-none absolute inset-x-6 top-6 h-px bg-gradient-to-r from-primary/60 via-border to-transparent" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Agentic RAG 质量工程平台
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              比较 Workflow 与 Agent 策略，再决定是否发布。
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              首页现在从策略验证开始：先看同一数据集上的质量、延迟和成本变化，再下钻
              improved / regressed 样本的 Trace 与原文证据。
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/evals" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
                开始一次评测
                <ArrowRight />
              </Link>
              <Link
                to="/evals/policies"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                查看 Agent 策略
              </Link>
              <Link
                to="/agent-runs"
                className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}
              >
                打开运行日志
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <SignalCard
                icon={<FlaskConical className="h-4 w-4" />}
                label="评测入口"
                value="baseline / candidate"
              />
              <SignalCard
                icon={<Activity className="h-4 w-4" />}
                label="证据下钻"
                value="Trace + Chunk"
              />
              <SignalCard
                icon={<Shield className="h-4 w-4" />}
                label="发布方式"
                value="人工确认"
              />
            </div>
          </div>
        </div>

        <aside className="border-t border-border bg-muted/20 p-5 sm:p-7 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <GitCompare className="h-4 w-4 text-primary" />
            策略验证闭环
          </div>
          <div className="mt-5 space-y-3">
            {loopSteps.map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-semibold tabular-nums text-muted-foreground">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1 rounded-lg border bg-card px-3 py-2 text-sm">
                  {step}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg border border-dashed bg-background/70 p-3 text-xs leading-6 text-muted-foreground">
            {hasKnowledge ? (
              <>
                <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-emerald-600" />
                已有可用知识底座。下一步是打开评测数据集，选择 baseline 与 candidate。
              </>
            ) : (
              "还没有可用知识底座。先导入文档并完成 Chunk 标注，再运行真实 Benchmark。"
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}

function SignalCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-sm font-medium">{value}</div>
    </div>
  )
}
