import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { Activity, Eye, RotateCcw, Search } from "lucide-react"
import { getAgentRunMetrics, listAgentRuns, type AgentRunListItem } from "@/api/agentRuns"
import { listAssistants } from "@/api/assistants"
import { Button } from "@/components/ui/button"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { Page, PageBody, PageHeader } from "@/components/ui/page-header"
import { Select } from "@/components/ui/select"
import { formatShanghaiDateTime, shanghaiDateInputToUtcIso } from "@/lib/dateTime"

function statusLabel(status: string) {
  if (status === "succeeded") return "成功"
  if (status === "failed") return "失败"
  if (status === "cancelled") return "已取消"
  if (status === "running") return "运行中"
  return status
}

function statusDotClass(status: string) {
  if (status === "succeeded") return "bg-emerald-500"
  if (status === "failed") return "bg-red-500"
  if (status === "running") return "bg-amber-500"
  if (status === "cancelled") return "bg-slate-400"
  return "bg-muted-foreground"
}

function sourceLabel(source: string) {
  if (source === "chat") return "问答助手"
  if (source === "eval") return "评测"
  return source
}

function formatRunTime(iso: string) {
  return formatShanghaiDateTime(iso, { includeSeconds: true, dateSeparator: "/" })
}

function formatLatency(ms: number | null | undefined) {
  if (ms == null) return "-"
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} 秒`
}

function formatTtft(row: AgentRunListItem) {
  const ttft = row.summary.ttftMs
  const tipParts = [
    ttft != null ? `首字等待 ${ttft} ms` : "暂无首字等待数据",
    row.summary.streamingMs != null ? `流式输出 ${row.summary.streamingMs} ms` : null,
    row.summary.latencyMs != null ? `端到端 ${row.summary.latencyMs} ms` : null,
  ].filter(Boolean)
  return {
    text: formatLatency(ttft),
    title: tipParts.join(" · "),
  }
}

type AgentRunFilters = {
  assistantId: string
  status: string
  source: string
  dateFrom: string
  dateTo: string
}

const EMPTY_FILTERS: AgentRunFilters = {
  assistantId: "",
  status: "",
  source: "",
  dateFrom: "",
  dateTo: "",
}

export function AgentRunsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<AgentRunFilters>(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<AgentRunFilters>(EMPTY_FILTERS)

  const assistantsQuery = useQuery({
    queryKey: ["assistants", "agent-runs-filter"],
    queryFn: () => listAssistants(),
  })

  const dateFromIso = appliedFilters.dateFrom
    ? shanghaiDateInputToUtcIso(appliedFilters.dateFrom, "start")
    : undefined
  const dateToIso = appliedFilters.dateTo
    ? shanghaiDateInputToUtcIso(appliedFilters.dateTo, "end")
    : undefined

  const runsQuery = useQuery({
    queryKey: ["agent-runs", page, appliedFilters],
    queryFn: () =>
      listAgentRuns({
        page,
        pageSize: 10,
        assistantId: appliedFilters.assistantId || undefined,
        status: appliedFilters.status || undefined,
        source: appliedFilters.source || undefined,
        ...(dateFromIso ? { dateFrom: dateFromIso } : {}),
        ...(dateToIso ? { dateTo: dateToIso } : {}),
      }),
  })

  const metricsQuery = useQuery({
    queryKey: ["agent-runs-metrics", appliedFilters.assistantId],
    queryFn: () => getAgentRunMetrics({ assistantId: appliedFilters.assistantId || undefined, days: 7 }),
  })

  const columns = useMemo<Array<DataTableColumn<AgentRunListItem>>>(
    () => [
      {
        key: "createdAt",
        header: "时间",
        className: "w-36 whitespace-nowrap",
        cellClassName: "whitespace-nowrap",
        render: (row) => (
          <span className="whitespace-nowrap text-xs">{formatRunTime(row.createdAt)}</span>
        ),
      },
      {
        key: "status",
        header: "状态",
        className: "w-24 whitespace-nowrap",
        cellClassName: "whitespace-nowrap",
        render: (row) => {
          const label = statusLabel(row.status)
          return (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap" aria-label={`运行状态：${label}`}>
              <span className={`h-2 w-2 rounded-full ${statusDotClass(row.status)}`} aria-hidden="true" />
              {label}
            </span>
          )
        },
      },
      {
        key: "source",
        header: "来源",
        className: "w-20 whitespace-nowrap",
        cellClassName: "whitespace-nowrap",
        render: (row) => <span className="whitespace-nowrap">{sourceLabel(row.source)}</span>,
      },
      {
        key: "question",
        header: "问题",
        className: "w-[34%]",
        cellClassName: "min-w-0",
        render: (row) => (
          <span className="block truncate" title={row.question}>
            {row.question}
          </span>
        ),
      },
      {
        key: "wait",
        header: "首字等待",
        className: "w-24 whitespace-nowrap",
        cellClassName: "whitespace-nowrap",
        render: (row) => {
          const metric = formatTtft(row)
          return (
            <span className="tabular-nums" title={metric.title}>
              {metric.text}
            </span>
          )
        },
      },
      {
        key: "latency",
        header: "端到端",
        className: "w-24 whitespace-nowrap",
        cellClassName: "whitespace-nowrap",
        render: (row) => (
          <span
            className="tabular-nums"
            title={row.summary.latencyMs != null ? `${row.summary.latencyMs} ms` : undefined}
          >
            {formatLatency(row.summary.latencyMs)}
          </span>
        ),
      },
      {
        key: "tools",
        header: "工具调用",
        className: "w-20 whitespace-nowrap",
        cellClassName: "whitespace-nowrap",
        render: (row) => <span className="tabular-nums">{row.summary.toolCallCount}次</span>,
      },
      {
        key: "error",
        header: "错误码",
        className: "w-24 whitespace-nowrap",
        cellClassName: "whitespace-nowrap",
        render: (row) => (
          <span className="block truncate" title={row.errorCode || undefined}>
            {row.errorCode || "-"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "操作",
        className: "w-20 whitespace-nowrap",
        cellClassName: "whitespace-nowrap",
        render: (row) => (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-foreground/80 hover:bg-primary/10 hover:text-primary"
            onClick={() => navigate(`/agent-runs/${row.id}`)}
            title="详情"
            aria-label="详情"
          >
            <Eye />
          </Button>
        ),
      },
    ],
    [navigate],
  )

  const metrics = metricsQuery.data
  const updateFilter = (key: keyof AgentRunFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }
  const handleSearch = () => {
    setAppliedFilters({ ...filters })
    setPage(1)
  }
  const handleReset = () => {
    setFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
    setPage(1)
  }

  return (
    <Page>
      <PageHeader
        items={[{ label: "运行日志" }]}
        description="查看每次回答的耗时、工具调用与详细过程；首字等待是用户真正感知的等待时间。"
      />

      <PageBody className="space-y-2">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="近 7 日运行" value={metrics ? String(metrics.totalRuns) : "-"} />
          <MetricCard label="成功率" value={metrics ? `${(metrics.successRate * 100).toFixed(1)}%` : "-"} />
          <MetricCard
            label="首字等待时间"
            value={
              metrics?.p95TtftMs != null
                ? formatLatency(Math.round(metrics.p95TtftMs))
                : metrics?.p95LatencyMs != null
                  ? formatLatency(Math.round(metrics.p95LatencyMs))
                  : "-"
            }
          />
          <MetricCard label="平均工具次数" value={metrics ? metrics.avgToolCallCount.toFixed(2) : "-"} />
          <MetricCard
            label="Planner 回退率"
            value={metrics ? `${(metrics.plannerFallbackRate * 100).toFixed(1)}%` : "-"}
          />
          <MetricCard
            label="上下文不足率"
            value={metrics ? `${(metrics.insufficientContextRate * 100).toFixed(1)}%` : "-"}
          />
        </section>

        <section className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
          <FilterSelect
            label="助手"
            value={filters.assistantId}
            onChange={(value) => updateFilter("assistantId", value)}
            options={[
              { value: "", label: "全部助手" },
              ...(assistantsQuery.data ?? []).map((row) => ({ value: row.id, label: row.name })),
            ]}
          />
          <FilterSelect
            label="状态"
            value={filters.status}
            onChange={(value) => updateFilter("status", value)}
            options={[
              { value: "", label: "全部状态" },
              { value: "succeeded", label: "成功" },
              { value: "failed", label: "失败" },
              { value: "cancelled", label: "已取消" },
              { value: "running", label: "运行中" },
            ]}
          />
          <FilterSelect
            label="来源"
            value={filters.source}
            onChange={(value) => updateFilter("source", value)}
            options={[
              { value: "", label: "全部来源" },
              { value: "chat", label: "问答助手" },
              { value: "eval", label: "评测" },
            ]}
          />
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            开始日期
            <input
              type="date"
              className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground"
              value={filters.dateFrom}
              onChange={(event) => updateFilter("dateFrom", event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            结束日期
            <input
              type="date"
              className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground"
              value={filters.dateTo}
              onChange={(event) => updateFilter("dateTo", event.target.value)}
            />
          </label>
          <div className="flex items-end gap-2">
            <Button variant="primary" size="lg" onClick={handleSearch}>
              <Search className="h-4 w-4" />
              查询
            </Button>
            <Button variant="dialog-cancel" size="lg" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              重置
            </Button>
          </div>
        </section>

        <DataTable
          columns={columns}
          data={runsQuery.data?.items ?? []}
          getRowKey={(row) => row.id}
          loading={runsQuery.isLoading}
          error={runsQuery.isError}
          emptyText="暂无运行记录"
          pagination={{
            page,
            pageSize: 10,
            total: runsQuery.data?.total ?? 0,
            onPageChange: setPage,
            showWhenSinglePage: true,
          }}
        />

      </PageBody>
    </Page>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Activity className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="min-w-[160px]">
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <Select value={value} onValueChange={onChange} options={options} />
    </div>
  )
}
