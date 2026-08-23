import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Activity, ExternalLink } from "lucide-react"
import type { AgentRunDetail } from "@/api/agentRuns"
import { Button } from "@/components/ui/button"
import { LoadingText } from "@/components/ui/loading-text"
import { MarkdownMessage } from "@/components/ui/markdown-message"
import { cn } from "@/lib/utils"
import { openKbItemChunk } from "@/features/kb/lib/openKbItemChunk"
import { RunProcessPanel } from "@/features/assistantChat/components/RunProcessPanel"
import {
  type RunProcess,
  type RunProcessStep,
} from "@/features/assistantChat/lib/runProcess"

export type TimelineStep = {
  sequence: number
  name: string
  kind: string
  status?: string
  decision?: string
  durationMs: number
  inputSummary?: Record<string, unknown>
  outputSummary?: Record<string, unknown>
}

type RetrievalPass = Record<string, unknown>

type DurationSegment = {
  key: string
  label: string
  durationMs: number
  color: string
}

type AgentRunTraceContentProps = {
  runId: string | null
  detail: AgentRunDetail | null
  loading?: boolean
  error?: string | null
  variant?: "drawer" | "page"
  showAnswerResult?: boolean
}

const STEP_DURATION_COLORS: Record<string, string> = {
  编排开销: "bg-sky-500",
  工具调用: "bg-amber-500",
  知识检索: "bg-emerald-500",
  模型生成: "bg-violet-500",
  其他开销: "bg-slate-300",
}

function stepDurationColor(bucket: string) {
  return STEP_DURATION_COLORS[bucket] ?? STEP_DURATION_COLORS["其他开销"]
}

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

export function formatDuration(ms: number | null | undefined) {
  if (ms == null) return "-"
  if (ms < 1) return "<1 ms"
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} 秒`
}

export function stepLabel(name: string) {
  const map: Record<string, string> = {
    pre_route: "预路由",
    route_query: "问题路由",
    plan_queries: "规划查询",
    retrieve: "知识检索",
    judge_context: "上下文判定",
    context_grader: "上下文判定",
    prepare_generation: "准备生成",
    prepare_direct_generation: "准备直答",
    prepare_grounded_generation: "准备有据生成",
    generate_answer: "模型生成",
    verify_citations: "引用校验",
    agent_planner: "模型决策",
    execute_tool: "执行工具",
    generation_guard: "生成守卫",
    build_insufficient_answer: "不足回答",
    workflow_fallback_exit: "回退标准流程",
    search_chunks: "统一检索",
    search_keyword: "关键词检索",
    search_vector: "向量检索",
    search_hybrid: "混合检索",
    rerank_results: "重排结果",
    expand_context: "扩展上下文",
    verify_evidence: "证据校验",
    get_document_info: "获取文档信息",
  }
  return map[name] || name
}

export function decisionLabel(decision: string) {
  const map: Record<string, string> = {
    agent: "进入智能代理",
    continue: "继续执行",
    direct: "直接回答",
    direct_answer_allowed: "允许直接回答",
    failed: "执行失败",
    fallback: "回退标准流程",
    finish_turn: "完成规划",
    forbidden: "权限拒绝",
    general_fallback: "通用回答回退",
    generated: "已生成",
    grounded: "基于证据回答",
    grounded_after_invalid: "无效规划后基于证据回答",
    insufficient: "证据不足",
    insufficient_after_invalid: "无效规划后证据不足",
    missing_pending: "缺少待执行工具",
    needs_more: "需要更多证据",
    planned: "已规划查询",
    rag: "知识库回答",
    rejected: "已拒绝",
    retrieved: "已检索",
    retry: "重试检索",
    retry_planned: "已规划重试查询",
    skipped_duplicate_queries: "跳过重复查询",
    succeeded: "执行成功",
    sufficient: "证据充足",
    terminal_insufficient: "证据不足并结束",
    timeout: "执行超时",
    tool_call: "计划调用工具",
    unknown_tool: "未知工具",
    verified: "已校验",
  }
  return map[decision] || decision
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export function stepToolName(step: TimelineStep) {
  if (step.kind === "tool") return step.name
  const output = step.outputSummary ?? {}
  const input = step.inputSummary ?? {}
  return (
    readString(output.tool) ||
    readString(output.toolName) ||
    readString(input.tool) ||
    readString(input.toolName)
  )
}

export function stepToolBadge(step: TimelineStep) {
  const toolName = stepToolName(step)
  if (!toolName) return null
  if (step.kind === "tool") return "工具调用"
  if (step.name === "agent_planner" && step.decision === "tool_call") {
    return `决策调用：${stepLabel(toolName)}`
  }
  return `工具：${stepLabel(toolName)}`
}

function stepTitle(step: TimelineStep) {
  if (step.kind === "tool") {
    return stepLabel(step.name)
  }
  return stepLabel(step.name)
}

export function visibleTimelineSteps(steps: TimelineStep[]) {
  const primarySteps = steps.filter((step) => step.kind !== "tool")
  return primarySteps.length ? primarySteps : steps
}

function segmentBucket(step: TimelineStep): string {
  if (step.name === "eval_run") return "其他开销"
  if (
    step.kind === "tool" ||
    step.name.includes("tool") ||
    step.name === "execute_tool"
  )
    return "工具调用"
  if (step.name.includes("retrieve") || step.kind === "retrieval")
    return "知识检索"
  if (
    step.name.includes("route") ||
    step.name.includes("plan") ||
    step.name.includes("judge") ||
    step.name.includes("grader") ||
    step.name.includes("verify") ||
    step.name.includes("prepare") ||
    step.name.includes("guard") ||
    step.name.includes("fallback") ||
    step.name === "pre_route"
  ) {
    return "编排开销"
  }
  if (step.name === "generate_answer" || step.name.startsWith("generate_"))
    return "模型生成"
  return "其他开销"
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
      status: step.status != null ? String(step.status) : undefined,
      decision: step.decision != null ? String(step.decision) : undefined,
      durationMs: Math.max(0, Number(step.durationMs ?? 0)),
      inputSummary: isPlainObject(step.inputSummary)
        ? step.inputSummary
        : undefined,
      outputSummary: isPlainObject(step.outputSummary)
        ? step.outputSummary
        : undefined,
    }))
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function buildEvalFallbackSteps(
  detail: AgentRunDetail | null,
  passes: RetrievalPass[]
): TimelineStep[] {
  if (!detail || detail.source !== "eval") return []
  const totalLatencyMs = detail.summary.latencyMs
  if (totalLatencyMs == null || totalLatencyMs <= 0) return []

  const steps: TimelineStep[] = []
  let sequence = 1
  let accounted = 0
  if (detail.executionMode === "agent" && passes.length === 0) {
    const orchestrationMs = Math.max(
      1,
      Math.min(250, Math.round(totalLatencyMs * 0.08))
    )
    steps.push({
      sequence,
      name: "agent_planner",
      kind: "node",
      durationMs: orchestrationMs,
    })
    sequence += 1
    accounted += orchestrationMs
  }
  for (const pass of passes) {
    const durationMs = Math.max(0, Number(pass.durationMs ?? 0))
    if (durationMs <= 0) continue
    steps.push({
      sequence,
      name: "retrieve",
      kind: "retrieval",
      durationMs,
    })
    sequence += 1
    accounted += durationMs
  }

  const remaining = Math.max(0, totalLatencyMs - accounted)
  if (remaining > 0) {
    steps.push({
      sequence,
      name:
        detail.executionMode === "agent" ||
        detail.status === "succeeded" ||
        detail.summary.estimatedOutputTokens
          ? "generate_answer"
          : "eval_run",
      kind: "node",
      durationMs: remaining,
    })
  }

  return steps
}

function buildSegments(
  steps: TimelineStep[],
  totalLatencyMs: number | null
): DurationSegment[] {
  const buckets = new Map<string, number>()
  const firstSeen = new Map<string, number>()
  for (const step of steps) {
    const key = segmentBucket(step)
    buckets.set(key, (buckets.get(key) || 0) + step.durationMs)
    if (!firstSeen.has(key)) firstSeen.set(key, step.sequence)
  }

  const orderedKeys = [...buckets.keys()]
    .filter((key) => (buckets.get(key) || 0) > 0)
    .sort((a, b) => (firstSeen.get(a) ?? 0) - (firstSeen.get(b) ?? 0))

  const segments: DurationSegment[] = []
  for (const key of orderedKeys) {
    const durationMs = buckets.get(key) || 0
    if (durationMs <= 0) continue
    segments.push({
      key,
      label: key,
      durationMs,
      color: stepDurationColor(key),
    })
  }

  const accounted = segments.reduce((sum, row) => sum + row.durationMs, 0)
  if (totalLatencyMs != null && totalLatencyMs > accounted + 20) {
    segments.push({
      key: "unaccounted",
      label: "其他开销",
      durationMs: totalLatencyMs - accounted,
      color: stepDurationColor("其他开销"),
    })
  }
  return segments
}

function useTraceViewModel(detail: AgentRunDetail | null) {
  const passes = useMemo(
    () => detail?.trace?.retrievalPasses ?? [],
    [detail?.trace?.retrievalPasses]
  )
  const steps = useMemo(() => {
    const parsed = parseSteps(detail?.trace?.steps ?? [])
    return parsed.length ? parsed : buildEvalFallbackSteps(detail, passes)
  }, [detail, passes])
  const timelineSteps = useMemo(() => visibleTimelineSteps(steps), [steps])
  const totalLatencyMs = detail?.summary.latencyMs ?? null
  const segments = useMemo(
    () => buildSegments(timelineSteps, totalLatencyMs),
    [timelineSteps, totalLatencyMs]
  )
  const segmentTotal = Math.max(
    totalLatencyMs ?? 0,
    segments.reduce((sum, row) => sum + row.durationMs, 0),
    1
  )
  const timelineScale = Math.max(
    totalLatencyMs ?? 0,
    ...timelineSteps.map((step) => step.durationMs),
    1
  )
  const retrieved = detail?.citations?.retrieved ?? []
  const used = detail?.citations?.used ?? []
  const process = useMemo(
    () => buildTraceProcess(detail, steps),
    [detail, steps]
  )

  return {
    passes,
    timelineSteps,
    totalLatencyMs,
    segments,
    segmentTotal,
    timelineScale,
    retrieved,
    used,
    process,
  }
}

function buildTraceProcess(
  detail: AgentRunDetail | null,
  steps: TimelineStep[]
): RunProcess {
  return {
    runId: detail?.id ?? null,
    status:
      detail?.status === "failed"
        ? "failed"
        : detail?.status === "running"
          ? "running"
          : "succeeded",
    steps: steps.map(traceStepToProcessStep),
  }
}

function traceStepToProcessStep(step: TimelineStep): RunProcessStep {
  const toolName = stepToolName(step)
  const status = processStatus(step.status)
  const failure = traceFailureDetail(step, toolName)
  if (failure) {
    return {
      id: `${step.sequence}:${step.kind}:${step.name}`,
      title: toolName ? `调用 ${toolName}` : stepTitle(step),
      status: "failed",
      detail: failure,
      durationMs: step.durationMs,
    }
  }

  if (step.name === "agent_planner" && step.decision === "tool_call") {
    const plannedTool = toolName || "工具"
    const reason = readSummaryValue(step.outputSummary, [
      "reason",
      "reasonCode",
      "decisionReason",
    ])
    return {
      id: `${step.sequence}:${step.kind}:${step.name}`,
      title: `决定调用 ${plannedTool}`,
      status,
      detail: [
        `这是知识库问题，不是闲聊；当前证据不足，需要调用 ${plannedTool}。`,
        reason ? `原因：${reason}。` : "",
      ].join(""),
      durationMs: step.durationMs,
    }
  }

  if (step.kind === "tool" && toolName) {
    return {
      id: `${step.sequence}:${step.kind}:${step.name}`,
      title: `调用 ${toolName}`,
      status,
      detail: summarizeTraceToolStep(step, toolName),
      durationMs: step.durationMs,
    }
  }

  return {
    id: `${step.sequence}:${step.kind}:${step.name}`,
    title: stepTitle(step),
    status,
    detail: summarizeTraceDecision(step),
    durationMs: step.durationMs,
  }
}

function processStatus(status: string | undefined): RunProcessStep["status"] {
  if (status === "failed") return "failed"
  if (status === "rejected") return "rejected"
  if (status === "running") return "running"
  if (status === "pending") return "pending"
  return "succeeded"
}

function summarizeTraceDecision(step: TimelineStep): string | undefined {
  const detailParts: string[] = []
  if (step.decision) detailParts.push(`决策：${decisionLabel(step.decision)}`)
  const reason = readSummaryValue(step.outputSummary, [
    "reason",
    "reasonCode",
    "decisionReason",
  ])
  if (reason) detailParts.push(`原因：${reason}`)
  return detailParts.length ? `${detailParts.join("。")}。` : undefined
}

function summarizeTraceToolStep(
  step: TimelineStep,
  toolName: string
): string | undefined {
  const input = unwrapSummaryObject(step.inputSummary)
  const output = unwrapSummaryObject(step.outputSummary)
  const parts: string[] = []
  const query = readTraceQuery(input)
  if (query) {
    parts.push(`使用查询 ${query} 检索知识库`)
  } else if (SEARCH_TOOL_NAMES_FOR_UI.has(toolName)) {
    parts.push("在知识库中检索相关证据")
  } else {
    parts.push(`${toolName} 已执行`)
  }
  const fusedCount = readNumber(output?.fusedCount)
  const hitCount = readNumber(output?.hitCount) ?? readNumber(output?.count)
  if (fusedCount != null) parts.push(`命中候选 ${fusedCount} 条`)
  else if (hitCount != null) parts.push(`命中 ${hitCount} 条`)
  return parts.map((part) => `${part}。`).join("")
}

const SEARCH_TOOL_NAMES_FOR_UI = new Set([
  "search_chunks",
  "search_keyword",
  "search_vector",
  "search_hybrid",
])

function traceFailureDetail(
  step: TimelineStep,
  toolName: string | null
): string | null {
  if (processStatus(step.status) !== "failed") return null
  const output = unwrapSummaryObject(step.outputSummary)
  const code =
    readSummaryValue(output ?? undefined, ["errorCode", "error_code", "code"]) ||
    step.decision
  const message =
    readSummaryValue(output ?? undefined, [
      "errorMessage",
      "error",
      "message",
      "reason",
    ]) || "未返回具体错误信息"
  const name = toolName || step.name
  return code
    ? `${name} 执行失败：${message}。失败类型：${code}。`
    : `${name} 执行失败：${message}。`
}

function readTraceQuery(value: Record<string, unknown> | null): string | null {
  if (!value) return null
  const query = readString(value.query)
  if (query) return query
  const queries = value.queries
  if (Array.isArray(queries)) {
    const first = queries.find((item) => typeof item === "string" && item.trim())
    return typeof first === "string" ? first.trim() : null
  }
  return null
}

function unwrapSummaryObject(
  value: Record<string, unknown> | undefined
): Record<string, unknown> | null {
  if (!value) return null
  const args = value.arguments
  if (isPlainObject(args)) return args
  const resultSummary = value.resultSummary
  if (isPlainObject(resultSummary)) return resultSummary
  return value
}

function readSummaryValue(
  value: Record<string, unknown> | undefined,
  keys: string[]
): string | null {
  if (!value) return null
  for (const key of keys) {
    const item = value[key]
    if (typeof item === "string" && item.trim()) return item.trim()
  }
  return null
}

export function AgentRunTraceContent({
  runId,
  detail,
  loading = false,
  error = null,
  variant = "drawer",
  showAnswerResult = true,
}: AgentRunTraceContentProps) {
  const view = useTraceViewModel(detail)

  if (loading && !detail)
    return <LoadingText className="justify-start">加载中</LoadingText>
  if (error) return <div className="text-sm text-destructive">{error}</div>
  if (!detail) return null

  if (variant === "page") {
    return (
      <AgentRunTracePageContent detail={detail} runId={runId} view={view} />
    )
  }

  return (
    <AgentRunTraceStack
      detail={detail}
      view={view}
      showAnswerResult={showAnswerResult}
    />
  )
}

function AgentRunTracePageContent({
  detail,
  view,
}: {
  detail: AgentRunDetail
  runId: string | null
  view: ReturnType<typeof useTraceViewModel>
}) {
  return (
    <div className="space-y-4">
      <section className="grid auto-cols-[minmax(9.5rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-1">
        <MetricCard label="状态" value={statusLabel(detail.status)} />
        <MetricCard label="模型" value={detail.model || "-"} />
        <MetricCard
          label="首字等待"
          value={formatDuration(detail.summary.ttftMs)}
        />
        <MetricCard
          label="端到端"
          value={formatDuration(detail.summary.latencyMs)}
        />
        <MetricCard
          label="工具调用"
          value={String(detail.summary.toolCallCount)}
        />
        <MetricCard
          label="引用"
          value={String(detail.summary.usedCitationCount)}
        />
      </section>

      <div
        className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
        data-testid="agent-run-detail-layout"
      >
        <div
          className="min-w-0 space-y-4"
          data-testid="agent-run-detail-main-rail"
        >
          <Panel title="思考过程">
            <RunProcessPanel
              process={view.process}
              title="思考过程"
              defaultOpen
              testId="agent-run-process"
            />
          </Panel>
          <Panel title="步骤耗时（技术）">
            <DurationSummary view={view} />
          </Panel>
          <Panel title="执行时间线">
            <TimelineList view={view} />
          </Panel>
        </div>

        <aside
          className="min-w-0 space-y-4"
          data-testid="agent-run-detail-side-rail"
        >
          <Panel title="检索详情">
            <RetrievalPasses passes={view.passes} layout="multi" />
          </Panel>
          <Panel title="引用结果">
            <CitationGrid retrieved={view.retrieved} used={view.used} />
          </Panel>
          <Panel title="问题">
            <QuestionBlock detail={detail} />
          </Panel>
          <Panel title="回答结果">
            <AnswerBlock detail={detail} />
          </Panel>
        </aside>
      </div>
    </div>
  )
}

function AgentRunTraceStack({
  detail,
  view,
  showAnswerResult,
}: {
  detail: AgentRunDetail
  view: ReturnType<typeof useTraceViewModel>
  showAnswerResult: boolean
}) {
  return (
    <>
      <section className="space-y-3">
        <h3 className="text-sm font-medium">摘要</h3>
        <SummaryBlock detail={detail} />
      </section>
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h3 className="text-sm font-medium">步骤耗时（技术）</h3>
          <div className="text-xs text-muted-foreground">
            端到端 {formatDuration(view.totalLatencyMs)}
          </div>
        </div>
        <DurationSummary view={view} />
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">思考过程</h3>
        <RunProcessPanel
          process={view.process}
          title="思考过程"
          defaultOpen
          testId="agent-run-process"
        />
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">执行时间线</h3>
        <TimelineList view={view} />
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">检索详情</h3>
        <RetrievalPasses passes={view.passes} layout="single" />
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">引用结果</h3>
        <CitationGrid retrieved={view.retrieved} used={view.used} />
      </section>
      {showAnswerResult ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">回答结果</h3>
          <AnswerResult detail={detail} />
        </section>
      ) : null}
    </>
  )
}

function SummaryBlock({
  detail,
  runId,
}: {
  detail: AgentRunDetail
  runId?: string | null
}) {
  return (
    <div className="space-y-3">
      {runId ? (
        <div className="text-xs break-all text-muted-foreground">
          Run ID：{runId}
        </div>
      ) : null}
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
            <div className="font-medium tabular-nums">
              {formatDuration(detail.summary.ttftMs)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">流式输出</div>
            <div className="font-medium tabular-nums">
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
        <div className="text-sm text-muted-foreground">
          当前过程详情不可用，仅展示摘要。
        </div>
      ) : null}
    </div>
  )
}

function DurationSummary({
  view,
}: {
  view: ReturnType<typeof useTraceViewModel>
}) {
  if (view.segments.length === 0) {
    return <div className="text-sm text-muted-foreground">暂无耗时明细</div>
  }

  return (
    <>
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {view.segments.map((segment) => (
          <div
            key={segment.key}
            className={segment.color}
            style={{
              width: `${Math.max(1.5, (segment.durationMs / view.segmentTotal) * 100)}%`,
            }}
            title={`${segment.label}: ${formatDuration(segment.durationMs)}`}
          />
        ))}
      </div>
      <div className="space-y-1.5">
        {view.segments.map((segment) => {
          const pct = (segment.durationMs / view.segmentTotal) * 100
          return (
            <div key={segment.key} className="flex items-center gap-2 text-sm">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-sm ${segment.color}`}
              />
              <span className="min-w-0 flex-1 truncate">{segment.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {formatDuration(segment.durationMs)}
              </span>
              <span className="w-14 text-right text-muted-foreground tabular-nums">
                {pct.toFixed(0)}%
              </span>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        条从左到右按时间线首次出现排序。「编排开销」含路由/准备/校验；「其他开销」是端到端减去已记账步骤的差额。
        用户体感请看上方的首字等待与流式输出。
      </p>
    </>
  )
}

function TimelineList({
  view,
}: {
  view: ReturnType<typeof useTraceViewModel>
}) {
  if (view.timelineSteps.length === 0) {
    return <div className="text-sm text-muted-foreground">暂无步骤</div>
  }

  return (
    <ol className="space-y-2">
      {view.timelineSteps.map((step) => {
        const widthPct = Math.max(
          step.durationMs > 0 ? 2 : 0.5,
          (step.durationMs / view.timelineScale) * 100
        )
        const pctOfTotal =
          view.totalLatencyMs && view.totalLatencyMs > 0
            ? (step.durationMs / view.totalLatencyMs) * 100
            : null
        const color = stepDurationColor(segmentBucket(step))
        return (
          <li
            key={`${step.name}-${step.sequence}`}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    #{step.sequence}
                  </span>
                  <span className="font-medium">{stepTitle(step)}</span>
                  {stepToolBadge(step) ? (
                    <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {stepToolBadge(step)}
                    </span>
                  ) : null}
                </div>
                {step.decision ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    决策：{decisionLabel(step.decision)}
                  </div>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <div className="font-medium tabular-nums">
                  {formatDuration(step.durationMs)}
                </div>
                {pctOfTotal != null ? (
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {pctOfTotal.toFixed(0)}%
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div
                className={`h-2 rounded-full ${color}`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function RetrievalPasses({
  passes,
  layout,
}: {
  passes: RetrievalPass[]
  layout: "single" | "multi"
}) {
  if (passes.length === 0) {
    return <div className="text-sm text-muted-foreground">无检索 Pass</div>
  }

  return (
    <div
      className={cn(
        "grid gap-2",
        layout === "multi" ? "md:grid-cols-2 2xl:grid-cols-3" : "grid-cols-1"
      )}
      data-testid="agent-run-retrieval-passes"
    >
      {passes.map((pass, index) => (
        <div
          key={index}
          className="min-w-0 rounded-md border px-2.5 py-1.5 text-sm"
        >
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="shrink-0 font-medium">Pass {index + 1}</div>
            <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {formatDuration(
                typeof pass.durationMs === "number" ? pass.durationMs : null
              )}
            </div>
          </div>
          <div
            className="mt-1 truncate text-xs text-muted-foreground"
            title={String(pass.query ?? "")}
          >
            {String(pass.query ?? "") || "-"}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>向量检索 {String(pass.vectorCount ?? 0)} 条</span>
            <span>关键词检索 {String(pass.keywordCount ?? 0)} 条</span>
            <span>RRF 最高分 {formatScore(pass.topFusedScore)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function CitationGrid({
  retrieved,
  used,
}: {
  retrieved: Array<Record<string, unknown>>
  used: Array<Record<string, unknown>>
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
      <CitationColumn
        title={`召回候选 (${dedupeCitationRows(retrieved).length})`}
        rows={dedupeCitationRows(retrieved)}
      />
      <CitationColumn
        title={`最终使用 (${dedupeCitationRows(used).length})`}
        rows={dedupeCitationRows(used)}
      />
    </div>
  )
}

function AnswerResult({ detail }: { detail: AgentRunDetail }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <QuestionBlock detail={detail} />
      <AnswerBlock detail={detail} />
    </div>
  )
}

function QuestionBlock({ detail }: { detail: AgentRunDetail }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2.5 text-sm">
      <div className="break-words whitespace-pre-wrap">
        {detail.question || "-"}
      </div>
    </div>
  )
}

function AnswerBlock({ detail }: { detail: AgentRunDetail }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2.5 text-sm">
      {detail.answer ? (
        <MarkdownMessage
          content={detail.answer}
          citationCount={detail.summary.usedCitationCount}
        />
      ) : (
        <div className="text-muted-foreground">暂无回答记录</div>
      )}
    </div>
  )
}

function CitationColumn({
  title,
  rows,
}: {
  title: string
  rows: Array<Record<string, unknown>>
}) {
  const navigate = useNavigate()

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
          const chunkIndex =
            typeof row.chunkIndex === "number" ? row.chunkIndex : 0
          const label = `${fileName} #${chunkIndex + 1}`
          return (
            <div
              key={`${itemId}-${index}`}
              className="flex min-h-8 items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm"
            >
              <span className="min-w-0 truncate font-medium" title={label}>
                {label}
              </span>
              {kbId && itemId ? (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() =>
                    openKbItemChunk(navigate, { kbId, itemId, chunkIndex })
                  }
                  aria-label="打开原文"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          )
        })
      )}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[5.25rem] rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Activity className="h-3.5 w-3.5 text-primary" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 truncate text-xl font-semibold tabular-nums">
        {value}
      </div>
    </div>
  )
}

function Panel({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        "space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm",
        className
      )}
    >
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </section>
  )
}
