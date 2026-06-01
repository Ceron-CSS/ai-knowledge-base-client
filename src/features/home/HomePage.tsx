import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import { BookOpen, Bot, Cpu, FileText } from "lucide-react"
import { getDashboardStats } from "@/api/stats"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const dailyConfig = {
  count: { label: "请求数", color: "oklch(0.65 0.12 240)" },
} satisfies ChartConfig

const PIE_COLORS = [
  "oklch(0.65 0.20 250)",
  "oklch(0.62 0.19 160)",
  "oklch(0.70 0.15 70)",
  "oklch(0.65 0.15 20)",
  "oklch(0.55 0.05 260)",
]

const pieConfig = {
  docCount: { label: "文档数" },
} satisfies ChartConfig

export function HomePage() {
  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  })

  const data = stats.data

  if (stats.isLoading) {
    return (
      <div className="space-y-2">
        <Breadcrumb items={[{ label: "主页" }]} />
        <div className="rounded-lg border bg-background px-4 py-10 text-center text-sm text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: "主页" }]} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<BookOpen className="h-5 w-5" />} label="知识库" value={data ? `${data.kbCount.enabled}/${data.kbCount.total}` : "-"} href="/kb" />
        <StatCard icon={<FileText className="h-5 w-5" />} label="文档条目" value={data ? String(data.itemCount) : "-"} href="/kb" />
        <StatCard icon={<Bot className="h-5 w-5" />} label="问答助手" value={data ? `${data.assistantCount.published}/${data.assistantCount.total}` : "-"} href="/assistants" />
        <StatCard icon={<Cpu className="h-5 w-5" />} label="模型供应商" value={data ? String(data.modelConfigCount) : "-"} href="/models" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">每日问答请求数</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.dailyRequests.length ? (
              <ChartContainer config={dailyConfig} className="h-64 w-full">
                <AreaChart data={data.dailyRequests} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <defs>
                    <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.65 0.12 240)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="oklch(0.65 0.12 240)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickLine={false} tickMargin={8} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
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

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">知识库文档数量统计</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.kbDocDist.length ? (
              <div className="flex items-center justify-center gap-4">
                <ChartContainer config={pieConfig} className="mt-2 h-48 w-48 shrink-0">
                  <PieChart>
                    <Pie
                      data={data.kbDocDist.map((d, i) => ({ ...d, fill: PIE_COLORS[i % PIE_COLORS.length] }))}
                      dataKey="docCount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={72}
                      paddingAngle={1}
                    >
                      {data.kbDocDist.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  </PieChart>
                </ChartContainer>
                <div className="space-y-1.5">
                  {data.kbDocDist.filter((d) => d.name !== "其他").map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="truncate">{d.name}</span>
                      <span className="shrink-0 tabular-nums font-medium">{d.docCount}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">暂无数据</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: string
  href: string
}) {
  return (
    <Link to={href} className="flex items-center gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition hover:bg-muted/30">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
      </div>
    </Link>
  )
}
