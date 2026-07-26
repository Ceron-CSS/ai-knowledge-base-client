import type { ModelProvider } from "@/api/models"
import { MODEL_PROVIDERS } from "@/features/modelProviders/constants/providers"

export function providerLabel(provider: ModelProvider) {
  return MODEL_PROVIDERS.find((item) => item.value === provider)?.label ?? provider
}
