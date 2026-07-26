import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import type { DashboardStats } from "@/api/stats"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { dailyConfig } from "@/features/home/constants/charts"

type DailyRequestsChartProps = {
  dailyRequests: DashboardStats["dailyRequests"]
}

export function DailyRequestsChart({ dailyRequests }: DailyRequestsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">每日问答请求数</CardTitle>
      </CardHeader>
      <CardContent>
        {dailyRequests.length ? (
          <ChartContainer config={dailyConfig} className="h-64 w-full">
            <AreaChart data={dailyRequests} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <defs>
                <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.12 240)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="oklch(0.65 0.12 240)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickLine={false} tickMargin={8} axisLine={false} tick={{ fontSize: 11 }} interval={3} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
              <ChartTooltip isAnimationActive={false} content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="oklch(0.65 0.12 240)"
                fill="url(#dailyGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">暂无数据</div>
        )}
      </CardContent>
    </Card>
  )
}
