import type { ChunkPreviewMode } from "@/api/kb"

export type VisibleChunkPreviewMode = Exclude<ChunkPreviewMode, "smart" | "advanced" | "sliding">

export const CHUNK_MODE_OPTIONS = [
  {
    value: "recursive",
    label: "递归分片",
    description: "按段落、换行、句末标点逐级切分，保留自然语义边界。",
  },
  {
    value: "token",
    label: "Token 分片",
    description: "按模型输入长度近似切分，适合中英混合、代码文本。",
  },
  {
    value: "structure",
    label: "结构感知",
    description: "优先按标题、列表、编号切分，超长再兜底。",
  },
  {
    value: "parent_child",
    label: "父子分片",
    description: "先切父级窗口，再生成子分片，减少跨章节混切。",
  },
] satisfies Array<{
  value: VisibleChunkPreviewMode
  label: string
  description: string
}>

export const CHUNK_SEPARATOR_OPTIONS = [
  { label: "换行符", value: "newline" },
  { label: "Markdown 一级标题：# 标题", value: "markdown_h1" },
  { label: "Markdown 二级标题：## 标题", value: "markdown_h2" },
  { label: "Markdown 三级标题：### 标题", value: "markdown_h3" },
  { label: "Markdown 四级标题：#### 标题", value: "markdown_h4" },
  { label: "数字编号：1. / 1、/ 1.1 / 2.3.1", value: "numbered_list" },
  { label: "中文序号：一、/ 二、/ 第一章", value: "chinese_numbered_list" },
] as const
