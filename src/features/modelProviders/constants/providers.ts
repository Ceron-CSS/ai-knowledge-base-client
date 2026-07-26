import type { ModelProvider } from "@/api/models"

export const MODEL_PROVIDERS: Array<{ value: ModelProvider; label: string; defaultApiUrl: string }> = [
  { value: "aliyun-bailian", label: "百炼", defaultApiUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  { value: "deepseek", label: "DeepSeek", defaultApiUrl: "https://api.deepseek.com/v1" },
  { value: "openai", label: "OpenAI", defaultApiUrl: "https://api.openai.com/v1" },
]
