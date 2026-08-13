import { Bot, Database, FlaskConical, Sparkles, Upload } from "lucide-react"

export const workflowSteps = [
  {
    title: "文档入库",
    description: "上传抽取、OCR 分片并保留页级溯源",
    Icon: Upload,
  },
  {
    title: "混合索引",
    description: "SQLite FTS5 与 Chroma 异步向量化",
    Icon: Database,
  },
  {
    title: "Agent 编排",
    description: "LangGraph 动态选择检索工具与参数",
    Icon: Bot,
  },
  {
    title: "流式生成",
    description: "证据评分后 SSE 回答并校验引用",
    Icon: Sparkles,
  },
  {
    title: "评测优化",
    description: "Trace 观测、评测对比与策略迭代",
    Icon: FlaskConical,
  },
] as const
