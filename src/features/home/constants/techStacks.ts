import { Database, Layers, Server } from "lucide-react"

export const techStacks = [
  {
    title: "前端技术栈",
    description: "负责交互界面、路由、数据请求与图表展示。",
    Icon: Layers,
    items: ["React 19 + TypeScript", "Vite 7 + Tailwind CSS 4", "React Router 7 + TanStack Query 5", "Recharts + lucide-react"],
  },
  {
    title: "后端技术栈",
    description: "负责认证、知识库数据、文件解析与问答流式响应。",
    Icon: Server,
    items: ["Node.js + Express 5", "Prisma 6 + SQLite", "JWT + bcryptjs + GitHub OAuth", "OpenAI-compatible API + SSE"],
  },
] as const

export const techStackItemIcon = Database
