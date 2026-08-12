import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ExternalLink, X } from "lucide-react"
import { getAgentRun, type AgentRunDetail } from "@/api/agentRuns"
import { Button } from "@/components/ui/button"
import { LoadingText } from "@/components/ui/loading-text"
import { openKbItemChunk } from "@/features/kb/lib/openKbItemChunk"

type AgentRunTraceDrawerProps = {
  runId: string | null
  open: boolean
  onClose: () => void
}

type TimelineStep = {
  sequence: number
  name: string
  kind: string
  decision?: string
  durationMs: number
}

type DurationSegment = {
  key: string
  label: string
  durationMs: number
  color: string
}

const SEGMENT_COLORS = [
  "bg-sky-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-cyan-600",
  "bg-orange-500",
  "bg-indigo-500",
]

function statusLabel(status: string) {
  if (status === "succeeded") return "成功"
  if (status === "failed") return "失败"
  if (status === "cancelled") return "已取消"
  if (status === "running") return "运行中"
  return status
}

function modeLabel(mode: string) {
  if (mode === "agent") return "智能代理"
  if (mode === "auto") return "自动选择"
  if (mode === "workflow") return "标准问答"
  return mode
}

function formatScore(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-"
  return value.toFixed(3)
}

function formatDuration(ms: number | null | undefined) {
  if (ms == null) return "-"
  if (ms < 1) return "<1 ms"
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} 秒`
}

function stepLabel(name: string) {
  const map: Record<string, string> = {
    pre_route: "预路由",
    route_query: "问题路由",
    plan_queries: "规划查询",
    retrieve: "知识检索",
    judge_context: "上下文判定",
    prepare_generation: "准备生成",
    prepare_direct_generation: "准备直答",
    generate_answer: "模型生成",
    verify_citations: "引用校验",
    agent_planner: "策略规划",
    execute_tool: "执行工具",
    generation_guard: "生成守卫",
    build_insufficient_answer: "不足回答",
    workflow_fallback_exit: "回退标准流程",
  }
  return map[name] || name
}

function segmentBucket(step: TimelineStep): string {
  if (step.kind === "tool" || step.name.includes("tool") || step.name === "execute_tool") return "工具调用"
  if (step.name.includes("retrieve") || step.kind === "retrieval") return "知识检索"
  // prepare_* 含 "generation"，必须先于模型生成判断，否则会被误归到生成
  if (
    step.name.includes("route") ||
    step.name.includes("plan") ||
    step.name.includes("judge") ||
    step.name.includes("verify") ||
    step.name.includes("prepare") ||
    step.name.includes("guard") ||
    step.name.includes("fallback") ||
    step.name === "pre_route"
  ) {
    return "编排开销"
  }
  if (step.name === "generate_answer" || step.name.startsWith("generate_")) return "模型生成"
  return "其他"
}

function dedupeCitationRows(rows: Array<Record<string, unknown>>) {
  const seen = new Set<string>()
  const deduped: Array<Record<string, unknown>> = []
  for (const row of rows) {
    const key = `${String(row.itemId ?? "")}:${String(row.chunkIndex ?? "")}:${String(row.fileName ?? "")}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(row)
  }
  return deduped
}

function parseSteps(rawSteps: Array<Record<string, unknown>>): TimelineStep[] {
  return rawSteps
    .slice()
    .sort((a, b) => Number(a.sequence ?? 0) - Number(b.sequence ?? 0))
    .map((step, index) => ({
      sequence: Number(step.sequence ?? index + 1),
      name: String(step.name ?? "step"),
      kind: String(step.kind ?? "node"),
      decision: step.decision != null ? String(step.decision) : undefined,
      durationMs: Math.max(0, Number(step.durationMs ?? 0)),
    }))
}

function buildSegments(steps: TimelineStep[], totalLatencyMs: number | null): DurationSegment[] {
  const buckets = new Map<string, number>()
  const firstSeen = new Map<string, number>()
  for (const step of steps) {
    const key = segmentBucket(step)
    buckets.set(key, (buckets.get(key) || 0) + step.durationMs)
    if (!firstSeen.has(key)) firstSeen.set(key, step.sequence)
  }

  // 按时间线首次出现排序，使条从左到右贴近真实执行顺序（生成通常在最后）
  const orderedKeys = [...buckets.keys()]
    .filter((key) => (buckets.get(key) || 0) > 0)
    .sort((a, b) => (firstSeen.get(a) ?? 0) - (firstSeen.get(b) ?? 0))

  const segments: DurationSegment[] = []
  let colorIndex = 0
  for (const key of orderedKeys) {
    const durationMs = buckets.get(key) || 0
    if (durationMs <= 0) continue
    segments.push({
      key,
      label: key,
      durationMs,
      color: SEGMENT_COLORS[colorIndex % SEGMENT_COLORS.length],
    })
    colorIndex += 1
  }

  const accounted = segments.reduce((sum, row) => sum + row.durationMs, 0)
  if (totalLatencyMs != null && totalLatencyMs > accounted + 20) {
    segments.push({
      key: "unaccounted",
      label: "其他开销",
      durationMs: totalLatencyMs - accounted,
      color: "bg-muted-foreground/40",
    })
  }
  return segments
}

export function AgentRunTraceDrawer({ runId, open, onClose }: AgentRunTraceDrawerProps) {
  const navigate = useNavigate()
  const [detail, setDetail] = useState<AgentRunDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !runId) return

    let cancelled = false
    let timer: number | undefined

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const next = await getAgentRun(runId!)
        if (cancelled) return
        setDetail(next)
        if (next.status === "running") {
          timer = window.setTimeout(() => {
            void load()
          }, 2000)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "加载失败")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [open, runId])

  const steps = useMemo(() => parseSteps(detail?.trace?.steps ?? []), [detail])
  const totalLatencyMs = detail?.summary.latencyMs ?? null
  const segments = useMemo(() => buildSegments(steps, totalLatencyMs), [steps, totalLatencyMs])
  const segmentTotal = Math.max(
    totalLatencyMs ?? 0,
    segments.reduce((sum, row) => sum + row.durationMs, 0),
    1,
  )
  const timelineScale = Math.max(totalLatencyMs ?? 0, ...steps.map((step) => step.durationMs), 1)

  if (!open) return null

  const passes = detail?.trace?.retrievalPasses ?? []
  const retrieved = detail?.citations?.retrieved ?? []
  const used = detail?.citations?.used ?? []

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">执行详情</h2>
            <p className="text-xs text-muted-foreground">{runId}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="关闭">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-auto p-4">
          {loading && !detail ? <LoadingText className="justify-start">加载中</LoadingText> : null}
          {error ? <div className="text-sm text-destructive">{error}</div> : null}
          {detail ? (
            <>
              <section className="space-y-3">
                <h3 className="text-sm font-medium">摘要</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>状态：{statusLabel(detail.status)}</div>
                  <div>模式：{modeLabel(detail.executionMode)}</div>
                  <div>模型：{detail.model || "-"}</div>
                  <div>工具调用：{detail.summary.toolCallCount}</div>
                  <div>引用：{detail.summary.usedCitationCount}</div>
                </div>
                <div className="rounded-md border bg-muted/30 px-3 py-2.5 text-sm">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <div>
                      <div className="text-xs text-muted-foreground">首字等待</div>
                      <div className="tabular-nums font-medium">
                        {formatDuration(detail.summary.ttftMs)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">流式输出</div>
                      <div className="tabular-nums font-medium">
                        {formatDuration(detail.summary.streamingMs)}
                      </div>
                    </div>
                    <div className="col-span-2 text-xs text-muted-foreground">
                      端到端 {formatDuration(detail.summary.latencyMs)}
                      {detail.summary.ttftMs != null
                        ? "（含流式；首字后内容已在边出边看）"
                        : " · 暂无首字拆分"}
                    </div>
                  </div>
                </div>
                {detail.errorMessage ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {detail.errorCode ? `${detail.errorCode}: ` : ""}
                    {detail.errorMessage}
                  </div>
                ) : null}
                {detail.traceUnavailable ? (
                  <div className="text-sm text-muted-foreground">当前过程详情不可用，仅展示摘要。</div>
                ) : null}
              </section>

              <section className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <h3 className="text-sm font-medium">步骤耗时（技术）</h3>
                  <div className="text-xs text-muted-foreground">端到端 {formatDuration(totalLatencyMs)}</div>
                </div>
                {segments.length === 0 ? (
                  <div className="text-sm text-muted-foreground">暂无耗时明细</div>
                ) : (
                  <>
                    <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                      {segments.map((segment) => (
                        <div
                          key={segment.key}
                          className={segment.color}
                          style={{ width: `${Math.max(1.5, (segment.durationMs / segmentTotal) * 100)}%` }}
                          title={`${segment.label}: ${formatDuration(segment.durationMs)}`}
                        />
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      {segments.map((segment) => {
                        const pct = (segment.durationMs / segmentTotal) * 100
                        return (
                          <div key={segment.key} className="flex items-center gap-2 text-sm">
                            <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${segment.color}`} />
                            <span className="min-w-0 flex-1 truncate">{segment.label}</span>
                            <span className="tabular-nums text-muted-foreground">{formatDuration(segment.durationMs)}</span>
                            <span className="w-14 text-right tabular-nums text-muted-foreground">{pct.toFixed(0)}%</span>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      条从左到右按时间线首次出现排序。「编排开销」含路由/准备/校验；「其他开销」是端到端减去已记账步骤的差额。
                      用户体感请看上方的首字等待与流式输出。
                    </p>
                  </>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-medium">执行时间线</h3>
                {steps.length === 0 ? (
                  <div className="text-sm text-muted-foreground">暂无步骤</div>
                ) : (
                  <ol className="space-y-2">
                    {steps.map((step) => {
                      const widthPct = Math.max(step.durationMs > 0 ? 2 : 0.5, (step.durationMs / timelineScale) * 100)
                      const pctOfTotal =
                        totalLatencyMs && totalLatencyMs > 0 ? (step.durationMs / totalLatencyMs) * 100 : null
                      return (
                        <li key={`${step.name}-${step.sequence}`} className="rounded-md border px-3 py-2 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-muted-foreground">#{step.sequence}</span>
                                <span className="font-medium">{stepLabel(step.name)}</span>
                                <span className="text-xs text-muted-foreground">{step.name}</span>
                              </div>
                              {step.decision ? (
                                <div className="mt-1 text-xs text-muted-foreground">decision: {step.decision}</div>
                              ) : null}
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="tabular-nums font-medium">{formatDuration(step.durationMs)}</div>
                              {pctOfTotal != null ? (
                                <div className="text-xs tabular-nums text-muted-foreground">{pctOfTotal.toFixed(0)}%</div>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-muted">
                            <div
                              className={`h-2 rounded-full ${
                                step.durationMs >= Math.max(timelineScale * 0.4, 500)
                                  ? "bg-emerald-500"
                                  : step.durationMs > 0
                                    ? "bg-sky-500"
                                    : "bg-muted-foreground/30"
                              }`}
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-medium">检索详情</h3>
                {passes.length === 0 ? (
                  <div className="text-sm text-muted-foreground">无检索 Pass</div>
                ) : (
                  passes.map((pass, index) => (
                    <div key={index} className="rounded-md border px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">Pass {index + 1}</div>
                        <div className="tabular-nums text-xs text-muted-foreground">
                          {formatDuration(typeof pass.durationMs === "number" ? pass.durationMs : null)}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">query: {String(pass.query ?? "")}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        vector {String(pass.vectorCount ?? 0)} / keyword {String(pass.keywordCount ?? 0)} / fused{" "}
                        {String(pass.fusedCount ?? 0)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        top score: vector {formatScore(pass.topVectorScore)} / keyword{" "}
                        {formatScore(pass.topKeywordScore)} / fused {formatScore(pass.topFusedScore)}
                      </div>
                    </div>
                  ))
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-medium">引用结果</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <CitationColumn
                    title={`召回候选 (${dedupeCitationRows(retrieved).length})`}
                    rows={dedupeCitationRows(retrieved)}
                    navigate={navigate}
                  />
                  <CitationColumn
                    title={`最终使用 (${dedupeCitationRows(used).length})`}
                    rows={dedupeCitationRows(used)}
                    navigate={navigate}
                  />
                </div>
              </section>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  )
}

function CitationColumn({
  title,
  rows,
  navigate,
}: {
  title: string
  rows: Array<Record<string, unknown>>
  navigate: ReturnType<typeof useNavigate>
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">无</div>
      ) : (
        rows.map((row, index) => {
          const kbId = String(row.kbId ?? "")
          const itemId = String(row.itemId ?? "")
          const fileName = String(row.fileName ?? "document")
          const chunkIndex = typeof row.chunkIndex === "number" ? row.chunkIndex : 0
          return (
            <div key={`${itemId}-${index}`} className="rounded-md border px-3 py-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{fileName}</div>
                  <div className="text-xs text-muted-foreground">#{chunkIndex + 1}</div>
                </div>
                {kbId && itemId ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openKbItemChunk(navigate, { kbId, itemId, chunkIndex })}
                    aria-label="打开原文"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
