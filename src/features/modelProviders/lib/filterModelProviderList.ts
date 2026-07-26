import type { ModelConfig } from "@/api/models"
import { providerLabel } from "@/features/modelProviders/lib/providerLabel"

export function filterModelProviderList(list: ModelConfig[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return list
  return list.filter((item) => providerLabel(item.provider).toLowerCase().includes(q))
}
