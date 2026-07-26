import type { ModelProvider } from "@/api/models"

export type ModelProviderFormState = {
  provider: ModelProvider
  apiUrl: string
  apiKey: string
}
