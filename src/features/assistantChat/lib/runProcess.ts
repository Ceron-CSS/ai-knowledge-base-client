import type { StreamEvent } from "@/api/assistantChat"

export type RunProcessStepStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "rejected"

export type RunProcessStep = {
  id: string
  title: string
  status: RunProcessStepStatus
  detail?: string
  durationMs?: number
}

export type RunProcess = {
  runId: string | null
  status: "idle" | "running" | "succeeded" | "failed"
  steps: RunProcessStep[]
}

export function buildInitialRunProcess(): RunProcess {
  return {
    runId: null,
    status: "idle",
    steps: [],
  }
}

export function applyStreamEventToProcess(
  process: RunProcess,
  event: StreamEvent
): RunProcess {
  if (event.type === "run_started") {
    return {
      runId: event.runId,
      status: "running",
      steps: upsertStep(process.steps, {
        id: "run",
        title: "判断执行模式",
        status: "succeeded",
        detail: event.requestedExecutionMode
          ? `用户问题进入${modeLabel(event.requestedExecutionMode)}模式，需要判断是否检索知识库或调用工具。`
          : undefined,
      }),
    }
  }

  if (event.type === "progress") {
    return {
      ...ensureRunning(process, event.runId),
      steps: upsertStep(process.steps, {
        id: `progress:${event.stage}`,
        title: event.title,
        status: "running",
        detail: event.detail,
      }),
    }
  }

  if (event.type === "tool_started") {
    return {
      ...ensureRunning(process, event.runId),
      steps: upsertStep(finishRunningProgress(process.steps), {
        id: toolStepId(event.toolCall.name, event.toolStep),
        title: toolCallTitle(event.toolCall.name),
        status: "running",
        detail: toolStartReason(event.toolCall.name),
      }),
    }
  }

  if (event.type === "tool_finished") {
    const status = event.status ?? "succeeded"
    return {
      ...ensureRunning(process, event.runId),
      steps: upsertStep(process.steps, {
        id: toolStepId(event.toolCall.name, event.toolStep),
        title: toolCallTitle(event.toolCall.name),
        status: status === "succeeded" ? "succeeded" : "failed",
        detail:
          status === "succeeded"
            ? summarizeToolResult(event.toolCall.name, event.summary)
            : summarizeToolFailure(
                event.toolCall.name,
                event.errorCode,
                event.errorMessage
              ),
        durationMs: event.toolCall.durationMs,
      }),
    }
  }

  if (event.type === "tool_rejected") {
    return {
      ...ensureRunning(process, event.runId),
      steps: upsertStep(process.steps, {
        id: `tool:${event.toolCall.name}:rejected`,
        title: toolCallTitle(event.toolCall.name),
        status: "rejected",
        detail: event.code
          ? `${event.toolCall.name} 未执行：策略拒绝。失败类型：${event.code}。`
          : `${event.toolCall.name} 未执行：策略拒绝。`,
      }),
    }
  }

  if (event.type === "generation_started") {
    return {
      ...ensureRunning(process, event.runId),
      steps: upsertStep(finishRunningProgress(process.steps), {
        id: "generate",
        title: "组织回答策略",
        status: "running",
        detail: "基于已经取得的证据和上下文组织回答；如果证据不足，会说明无法可靠回答。",
      }),
    }
  }

  if (event.type === "delta") {
    return process
  }

  if (event.type === "done") {
    return {
      runId: event.runId ?? process.runId,
      status: "succeeded",
      steps: process.steps.map((step) =>
        step.status === "running" ? { ...step, status: "succeeded" } : step
      ),
    }
  }

  if (event.type === "error") {
    return {
      runId: event.runId ?? process.runId,
      status: "failed",
      steps: upsertStep(process.steps, {
        id: "error",
        title: "说明失败原因",
        status: "failed",
        detail: `本次执行失败：${event.message}`,
      }),
    }
  }

  return process
}

export function summarizeCompletedProcess(process: RunProcess): string {
  const completed = process.steps.filter((step) => step.status === "succeeded")
  const generationCount = completed.filter((step) => step.id === "generate").length
  const judgmentCount = completed.filter(
    (step) => step.id === "run" || step.id.startsWith("progress:")
  ).length
  const toolCount = completed.filter((step) =>
    step.id.startsWith("tool:")
  ).length
  const parts: string[] = []
  if (judgmentCount) parts.push(`判断 ${judgmentCount} 步`)
  if (toolCount) parts.push(`工具 ${toolCount} 步`)
  if (generationCount) parts.push(`回答策略 ${generationCount} 步`)
  return parts.length ? `思考过程已完成：${parts.join("，")}` : "思考过程已完成"
}

function ensureRunning(process: RunProcess, runId: string): RunProcess {
  return {
    runId: process.runId ?? runId,
    status: process.status === "idle" ? "running" : process.status,
    steps: process.steps,
  }
}

function upsertStep(steps: RunProcessStep[], nextStep: RunProcessStep) {
  const index = steps.findIndex((step) => step.id === nextStep.id)
  if (index === -1) return [...steps, nextStep]
  const next = [...steps]
  next[index] = { ...next[index], ...nextStep }
  return next
}

function finishRunningProgress(steps: RunProcessStep[]) {
  return steps.map((step) =>
    step.id.startsWith("progress:") && step.status === "running"
      ? { ...step, status: "succeeded" as const }
      : step
  )
}

function toolStepId(toolName: string, step: number) {
  return `tool:${toolName}:${step}`
}

export function toolTitle(toolName: string) {
  if (
    toolName === "search_chunks" ||
    toolName === "search_keyword" ||
    toolName === "search_vector" ||
    toolName === "search_hybrid"
  ) {
    return "检索知识库"
  }
  if (toolName === "rerank_results") return "重排结果"
  if (toolName === "expand_context") return "扩展上下文"
  if (toolName === "verify_evidence") return "验证证据"
  if (toolName === "get_document_info") return "读取文档信息"
  return "执行工具"
}

export function toolCallTitle(toolName: string) {
  return `调用 ${toolName}`
}

function toolStartReason(toolName: string) {
  if (toolName === "search_hybrid") {
    return "选择混合检索：关键词命中用户明确表达，向量检索补充语义相近的用法说明。"
  }
  if (toolName === "search_keyword") {
    return "选择关键词检索：用户问题包含明确术语，先用精确词命中文档。"
  }
  if (toolName === "search_vector") {
    return "选择向量检索：用户表达偏自然语言，需要用语义相似度查找相关内容。"
  }
  if (toolName === "search_chunks") {
    return "调用统一检索：在知识库中查找能支撑回答的片段。"
  }
  if (toolName === "rerank_results") {
    return "调用重排：候选内容较多，需要重新排序以优先使用更相关的证据。"
  }
  if (toolName === "expand_context") {
    return "调用上下文扩展：已有片段需要相邻内容帮助判断完整含义。"
  }
  if (toolName === "verify_evidence") {
    return "调用证据验证：回答前检查证据是否足够支撑结论。"
  }
  if (toolName === "get_document_info") {
    return "调用文档信息读取：需要查看文档元信息来辅助判断。"
  }
  return `调用 ${toolName}：当前步骤需要这个工具继续推进。`
}

function summarizeToolResult(
  toolName: string,
  summary: Record<string, unknown> | undefined
) {
  const query = summary ? readString(summary.query) : null
  const prefix = toolCompletionReason(toolName, query)
  if (!summary) return `${prefix}${toolName} 已完成。`
  const fusedCount = readNumber(summary.fusedCount)
  const hitCount = readNumber(summary.hitCount) ?? readNumber(summary.count)
  const resultParts: string[] = []
  if (query) resultParts.push(`检索 ${query}`)
  if (fusedCount != null) resultParts.push(`融合候选 ${fusedCount} 条`)
  if (hitCount != null) resultParts.push(`命中 ${hitCount} 条`)
  if (resultParts.length) return `${prefix}${resultParts.join("，")}。`
  if (query && fusedCount != null)
    return `检索 ${query}，融合候选 ${fusedCount} 条`
  if (query) return `检索 ${query}`
  if (fusedCount != null) return `融合候选 ${fusedCount} 条`
  const flattened = flattenSummary(summary)
  return flattened ? `${prefix}${flattened}。` : `${prefix}${toolName} 已完成。`
}

function toolCompletionReason(toolName: string, query: string | null) {
  if (toolName === "search_hybrid" && query) {
    return `选择混合检索：关键词命中 ${query}，向量检索补充语义相近的用法说明。`
  }
  return toolStartReason(toolName)
}

function summarizeToolFailure(
  toolName: string,
  errorCode: string | undefined,
  errorMessage: string | undefined
) {
  const reason = errorMessage?.trim() || "未返回具体错误信息"
  return errorCode
    ? `${toolName} 执行失败：${reason}。失败类型：${errorCode}。`
    : `${toolName} 执行失败：${reason}。`
}

function flattenSummary(summary: Record<string, unknown>) {
  return Object.entries(summary)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${formatValue(value)}`)
    .join("，")
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function formatValue(value: unknown): string {
  if (value == null) return "-"
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value)
  }
  if (Array.isArray(value)) return `${value.length} 项`
  if (typeof value === "object") return "已记录"
  return String(value)
}

function modeLabel(mode: string) {
  if (mode === "agent") return "智能代理"
  if (mode === "auto") return "自动选择"
  if (mode === "workflow") return "标准问答"
  return mode
}
