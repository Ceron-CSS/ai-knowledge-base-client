import { Cell, Pie, PieChart } from "recharts"
import type { DashboardStats } from "@/api/stats"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PIE_COLORS, pieConfig } from "@/features/home/constants/charts"

type KbDocDistChartProps = {
  kbDocDist: DashboardStats["kbDocDist"]
}

export function KbDocDistChart({ kbDocDist }: KbDocDistChartProps) {
  const hasDocData = kbDocDist.some((d) => d.docCount > 0)
  if (!hasDocData) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">知识库文档数量统计</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-4">
          <ChartContainer config={pieConfig} className="mt-2 h-48 w-48 shrink-0">
            <PieChart>
              <Pie
                data={kbDocDist.map((d, i) => ({ ...d, fill: PIE_COLORS[i % PIE_COLORS.length] }))}
                dataKey="docCount"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={72}
                paddingAngle={1}
              >
                {kbDocDist.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent nameKey="name" />} />
            </PieChart>
          </ChartContainer>
          <div className="space-y-1.5">
            {kbDocDist
              .filter((d) => d.name !== "其他")
              .map((d, i) => (
                <div key={d.name} className="flex items-center gap-1 text-sm">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="truncate">{d.name}</span>
                  <span className="shrink-0 tabular-nums font-medium">{d.docCount}</span>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function hasKbDocDistData(kbDocDist: DashboardStats["kbDocDist"]) {
  return kbDocDist.some((d) => d.docCount > 0)
}
