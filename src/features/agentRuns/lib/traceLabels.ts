export function statusLabel(status: string) {
  if (status === "succeeded") return "成功"
  if (status === "failed") return "失败"
  if (status === "cancelled") return "已取消"
  if (status === "running") return "运行中"
  return status
}

export function modeLabel(mode: string) {
  if (mode === "agent") return "智能代理"
  if (mode === "auto") return "自动选择"
  if (mode === "workflow") return "标准问答"
  return mode
}

export function formatScore(value: unknown) {
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
