import { requestJson } from "@/api/http"

export type ModelProvider = "aliyun-bailian" | "deepseek" | "openai"

export type ModelConfig = {
  id: string
  provider: ModelProvider
  apiUrl: string
  apiKeyMasked: string
  toolCallingEnabled: boolean
  toolCallingVerifiedAt: string | null
  toolCallingVerifiedModel: string | null
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

export function deleteModelConfig(id: string, options?: { acknowledgeLinked?: boolean }) {
  return requestJson<void>(`/model-configs/${id}`, {
    method: "DELETE",
    query: options?.acknowledgeLinked ? { acknowledgeLinked: true } : undefined,
  })
}

export type ModelConfigLinkedAssistant = {
  id: string
  name: string
  published: boolean
}

export function getModelConfigLinkedAssistants(id: string) {
  return requestJson<ModelConfigLinkedAssistant[]>(`/model-configs/${id}/assistants`)
}
