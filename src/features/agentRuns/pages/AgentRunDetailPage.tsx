import { useQuery } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { getAgentRun } from "@/api/agentRuns"
import { Page, PageBody, PageHeader } from "@/components/ui/page-header"
import { AgentRunTraceContent } from "@/features/agentRuns/components/AgentRunTraceContent"

export function AgentRunDetailPage() {
  const { runId = "" } = useParams()
  const runQuery = useQuery({
    queryKey: ["agent-run", runId],
    queryFn: () => getAgentRun(runId),
    enabled: Boolean(runId),
    refetchInterval: (query) => (query.state.data?.status === "running" ? 2000 : false),
  })

  return (
    <Page fill>
      <PageHeader
        items={[
          { label: "运行日志", href: "/agent-runs" },
          { label: "执行详情" },
        ]}
        description={runId ? `Run ${runId}` : "查看本次运行的步骤、检索、引用和回答结果。"}
      />

      <PageBody className="min-h-0 overflow-y-auto space-y-4">
        <AgentRunTraceContent
          runId={runId}
          detail={runQuery.data ?? null}
          loading={runQuery.isLoading}
          error={runQuery.isError ? "运行不存在或加载失败" : null}
          variant="page"
        />
      </PageBody>
    </Page>
  )
}
