import type { ChartConfig } from "@/components/ui/chart"

export const dailyConfig = {
  count: { label: "请求数", color: "oklch(0.65 0.12 240)" },
} satisfies ChartConfig

export const PIE_COLORS = [
  "oklch(0.65 0.20 250)",
  "oklch(0.62 0.19 160)",
  "oklch(0.70 0.15 70)",
  "oklch(0.65 0.15 20)",
  "oklch(0.55 0.05 260)",
]

export const pieConfig = {
  docCount: { label: "文档数" },
} satisfies ChartConfig
