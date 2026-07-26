import { Layers, Search, Send, ShieldCheck, Sparkles } from "lucide-react"

export const workflowSteps = [
  {
    title: "用户操作",
    description: "管理知识、上传文档、发起问答",
    Icon: Send,
  },
  {
    title: "前端请求",
    description: "API Client 携带 JWT 调用服务",
    Icon: Layers,
  },
  {
    title: "后端处理",
    description: "鉴权、校验、业务编排与数据读写",
    Icon: ShieldCheck,
  },
  {
    title: "知识检索",
    description: "查询知识库、文档切片与引用信息",
    Icon: Search,
  },
  {
    title: "AI 响应",
    description: "调用模型并通过 SSE 流式返回",
    Icon: Sparkles,
  },
] as const
