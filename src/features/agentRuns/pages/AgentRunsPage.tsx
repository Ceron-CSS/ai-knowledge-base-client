import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Activity } from "lucide-react"
import { getAgentRunMetrics, listAgentRuns, type AgentRunListItem } from "@/api/agentRuns"
import { listAssistants } from "@/api/assistants"
import { Button } from "@/components/ui/button"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { Page, PageBody, PageHeader } from "@/components/ui/page-header"
import { Select } from "@/components/ui/select"
import { AgentRunTraceDrawer } from "@/features/assistantChat/components/AgentRunTraceDrawer"

function statusLabel(status: string) {
  if (status === "succeeded") return "成功"
  if (status === "failed") return "失败"
  if (status === "cancelled") return "已取消"
  if (status === "running") return "运行中"
  return status
}

function sourceLabel(source: string) {
  if (source === "chat") return "问答助手"
  if (source === "eval") return "评测与策略"
  return source
}

function executionModeLabel(mode: string) {
  if (mode === "agent") return "智能代理"
  if (mode === "auto") return "自动选择"
  if (mode === "workflow") return "标准问答"
  return mode
}

/** 例：2026/5/31 01:07:49 */
function formatRunTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatLatency(ms: number | null | undefined) {
  if (ms == null) return "-"
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} 秒`
}

/** 列表只展示真实/可推断的 TTFT；没有则显示 "-"，绝不拿端到端冒充 */
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

export function AgentRunsPage() {
  const [page, setPage] = useState(1)
  const [assistantId, setAssistantId] = useState("")
  const [status, setStatus] = useState("")
  const [source, setSource] = useState("")
  const [executionMode, setExecutionMode] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  const assistantsQuery = useQuery({
    queryKey: ["assistants", "agent-runs-filter"],
    queryFn: () => listAssistants(),
  })

  const dateFromIso = dateFrom ? `${dateFrom}T00:00:00.000Z` : undefined
  const dateToIso = dateTo ? `${dateTo}T23:59:59.999Z` : undefined

  const runsQuery = useQuery({
    queryKey: ["agent-runs", page, assistantId, status, source, executionMode, dateFrom, dateTo],
    queryFn: () =>
      listAgentRuns({
        page,
        pageSize: 10,
        assistantId: assistantId || undefined,
        status: status || undefined,
        source: source || undefined,
        executionMode: executionMode || undefined,
        dateFrom: dateFromIso,
        dateTo: dateToIso,
      }),
  })

  const metricsQuery = useQuery({
    queryKey: ["agent-runs-metrics", assistantId],
    queryFn: () => getAgentRunMetrics({ assistantId: assistantId || undefined, days: 7 }),
  })

  const columns = useMemo<Array<DataTableColumn<AgentRunListItem>>>(
    () => [
      {
        key: "createdAt",
        header: "时间",
        render: (row) => (
          <span className="whitespace-nowrap text-xs">{formatRunTime(row.createdAt)}</span>
        ),
      },
      {
        key: "status",
        header: "状态",
        render: (row) => statusLabel(row.status),
      },
      {
        key: "source",
        header: "来源",
        render: (row) => sourceLabel(row.source),
      },
      {
        key: "executionMode",
        header: "回答策略",
        render: (row) => executionModeLabel(row.executionMode),
      },
      {
        key: "question",
        header: "问题",
        render: (row) => <span className="line-clamp-2 max-w-[280px]">{row.question}</span>,
      },
      {
        key: "wait",
        header: "首字等待",
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
        render: (row) => <span className="tabular-nums">{row.summary.toolCallCount}</span>,
      },
      {
        key: "error",
        header: "错误码",
        render: (row) => row.errorCode || "-",
      },
      {
        key: "actions",
        header: "操作",
        render: (row) => (
          <Button variant="outline" size="sm" onClick={() => setSelectedRunId(row.id)}>
            详情
          </Button>
        ),
      },
    ],
    [],
  )

  const metrics = metricsQuery.data

  return (
    <Page>
      <PageHeader
        items={[{ label: "运行日志" }]}
        description="查看每次回答的耗时、工具调用与详细过程；首字等待是用户真正干等的时间"
      />

      <PageBody className="space-y-2">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="近 7 日运行" value={metrics ? String(metrics.totalRuns) : "-"} />
        <MetricCard label="成功率" value={metrics ? `${(metrics.successRate * 100).toFixed(1)}%` : "-"} />
        <MetricCard
          label="P95 首字等待"
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
          label="策略回退率"
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
          value={assistantId}
          onChange={(value) => {
            setAssistantId(value)
            setPage(1)
          }}
          options={[
            { value: "", label: "全部助手" },
            ...(assistantsQuery.data ?? []).map((row) => ({ value: row.id, label: row.name })),
          ]}
        />
        <FilterSelect
          label="状态"
          value={status}
          onChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
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
          value={source}
          onChange={(value) => {
            setSource(value)
            setPage(1)
          }}
          options={[
            { value: "", label: "全部来源" },
            { value: "chat", label: "问答助手" },
            { value: "eval", label: "评测与策略" },
          ]}
        />
        <FilterSelect
          label="回答策略"
          value={executionMode}
          onChange={(value) => {
            setExecutionMode(value)
            setPage(1)
          }}
          options={[
            { value: "", label: "全部策略" },
            { value: "workflow", label: "标准问答" },
            { value: "agent", label: "智能代理" },
            { value: "auto", label: "自动选择" },
          ]}
        />
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          开始日期
          <input
            type="date"
            className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value)
              setPage(1)
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          结束日期
          <input
            type="date"
            className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value)
              setPage(1)
            }}
          />
        </label>
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
        }}
      />

      <AgentRunTraceDrawer
        open={!!selectedRunId}
        runId={selectedRunId}
        onClose={() => setSelectedRunId(null)}
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
