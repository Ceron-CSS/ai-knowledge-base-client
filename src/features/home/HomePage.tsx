import { useMemo } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Bar, BarChart, CartesianGrid, LabelList, Pie, PieChart, XAxis, YAxis } from "recharts"
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

const kbChartConfig = {
  docCount: { label: "文档数", color: "oklch(0.62 0.19 145)" },
} satisfies ChartConfig

const pieChartConfig = {
  published: { label: "已发布", color: "oklch(0.62 0.19 145)" },
  unpublished: { label: "未发布", color: "oklch(0.55 0 0)" },
} satisfies ChartConfig

export function HomePage() {
  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  })

  const data = stats.data

  const pieData = useMemo(() => {
    if (!data) return []
    return [
      { name: "published", value: data.assistantCount.published, fill: "var(--color-published)" },
      { name: "unpublished", value: data.assistantCount.total - data.assistantCount.published, fill: "var(--color-unpublished)" },
    ]
  }, [data])

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

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<BookOpen className="h-5 w-5" />} label="知识库" value={data ? `${data.kbCount.enabled}/${data.kbCount.total}` : "-"} href="/kb" />
        <StatCard icon={<FileText className="h-5 w-5" />} label="文档条目" value={data ? String(data.itemCount) : "-"} href="/kb" />
        <StatCard icon={<Cpu className="h-5 w-5" />} label="模型供应商" value={data ? String(data.modelConfigCount) : "-"} href="/models" />
        <StatCard icon={<Bot className="h-5 w-5" />} label="问答助手" value={data ? `${data.assistantCount.published}/${data.assistantCount.total}` : "-"} href="/assistants" />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">知识库文档分布</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.kbDocs.length ? (
              <ChartContainer config={kbChartConfig} className="h-64 w-full">
                <BarChart data={data.kbDocs} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tickLine={false} tickMargin={8} axisLine={false} tick={{ fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="docCount" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="docCount" position="top" fontSize={11} />
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">暂无数据</div>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">问答助手发布比例</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.assistantCount.total > 0 ? (
              <ChartContainer config={pieChartConfig} className="mx-auto aspect-square h-64">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2} />
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">暂无数据</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent KBs */}
      {data && data.recentKbs.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">最近更新的知识库</CardTitle>
          </CardHeader>
          <CardContent className="divide-y px-0 py-0">
            {data.recentKbs.map((kb) => (
              <Link
                key={kb.id}
                to={`/kb/${kb.id}`}
                className="flex items-center justify-between px-6 py-2.5 text-sm hover:bg-muted/40"
              >
                <span className="truncate font-medium">{kb.name}</span>
                <span className="ml-4 shrink-0 text-muted-foreground">
                  {new Date(kb.updatedAt).toLocaleString()}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
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
