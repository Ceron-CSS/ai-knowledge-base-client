import type { ModelProvider } from "@/api/models"
import { MODEL_PROVIDERS } from "@/features/modelProviders/constants/providers"
import type { ModelProviderFormState } from "@/features/modelProviders/types"

export function initialModelProviderFormState(provider: ModelProvider = "aliyun-bailian"): ModelProviderFormState {
  const match = MODEL_PROVIDERS.find((item) => item.value === provider) ?? MODEL_PROVIDERS[0]
  return {
    provider: match.value,
    apiUrl: match.defaultApiUrl,
    apiKey: "",
  }
}

export function getModelProviderFormError(form: ModelProviderFormState, options?: { isEditing?: boolean }): string | null {
  if (!form.apiUrl.trim()) return "API URL 不能为空"
  if (!options?.isEditing && !form.apiKey.trim()) return "API KEY 不能为空"
  try {
    new URL(form.apiUrl.trim())
  } catch {
    return "API URL 格式不正确"
  }
  return null
}
