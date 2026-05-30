import { requestJson } from "@/api/http"

export type ModelProvider = "aliyun-bailian" | "deepseek"

export type ModelConfig = {
  id: string
  provider: ModelProvider
  apiUrl: string
  apiKeyMasked: string
  createdAt: string
  updatedAt: string
}

export function listModelConfigs() {
  return requestJson<ModelConfig[]>("/model-configs")
}

export function createModelConfig(body: {
  provider: ModelProvider
  apiUrl: string
  apiKey: string
}) {
  return requestJson<ModelConfig>("/model-configs", { method: "POST", body })
}

export function updateModelConfig(
  id: string,
  body: { provider?: ModelProvider; apiUrl?: string; apiKey?: string },
) {
  return requestJson<ModelConfig>(`/model-configs/${id}`, { method: "PATCH", body })
}

export function deleteModelConfig(id: string) {
  return requestJson<void>(`/model-configs/${id}`, { method: "DELETE" })
}
