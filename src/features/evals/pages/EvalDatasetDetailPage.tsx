import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { HttpError } from "@/api/http"
import type { EvalRunCreateBody } from "@/api/evals"
import { Button } from "@/components/ui/button"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { DataTable } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { LoadingText } from "@/components/ui/loading-text"
import { Page, PageBody, PageHeader } from "@/components/ui/page-header"
import { cn } from "@/lib/utils"
import { EvalQueryEditorDialog } from "@/features/evals/components/EvalQueryEditorDialog"
import { EvalRunCreateDialog } from "@/features/evals/components/EvalRunCreateDialog"
import { EvalRunHistoryPanel } from "@/features/evals/components/EvalRunHistoryPanel"
import {
  useEvalDatasetDetailPage,
  type EvalDetailTab,
} from "@/features/evals/hooks/useEvalDatasetDetailPage"
import { useCreateEvalRun, useEvalMetricTrends, useEvalRuns } from "@/features/evals/hooks/queries"
import { formatEvalDateTime } from "@/features/evals/lib/formatDate"
import { formatMetricNumber } from "@/features/evals/lib/labels"

const TABS: Array<{ id: EvalDetailTab; label: string }> = [
  { id: "queries", label: "问题集" },
  { id: "runs", label: "运行历史" },
  { id: "trends", label: "趋势" },
]

export function EvalDatasetDetailPage() {
  const navigate = useNavigate()
  const page = useEvalDatasetDetailPage()
  const dataset = page.dataset.data
  const createRun = useCreateEvalRun(page.datasetId)
  const trends = useEvalMetricTrends(page.datasetId, { limit: 20 }, page.tab === "trends")
  const runs = useEvalRuns(page.datasetId, { page: 1, pageSize: 1 }, Boolean(dataset))

  const [createOpen, setCreateOpen] = useState(false)

  async function submitRun(body: EvalRunCreateBody) {
    const run = await createRun.mutateAsync(body)
    setCreateOpen(false)
    navigate(`/evals/runs/${run.id}`)
  }

  const createErrorText =
    createRun.error instanceof HttpError
      ? createRun.error.message
      : createRun.error instanceof Error
        ? createRun.error.message
        : null

  const queryCount = page.filtered.length
  const unlabeledCount = page.unlabeledCount
  const runCount = runs.data?.total ?? 0
  const canStartEval = unlabeledCount === 0 && queryCount > 0

  return (
    <Page>
      <PageHeader
        items={[
          { label: "评测与优化", href: "/evals" },
          { label: dataset?.name || (page.dataset.isLoading ? "加载中…" : "数据集") },
        ]}
        description={dataset?.description || "维护评测问题、参考答案与相关 Chunk 标签；策略发布请前往 Agent 策略中心"}
        actions={
          dataset ? (
            <Button variant="outline" size="lg" onClick={() => navigate("/evals/policies")}>
              Agent 策略中心
            </Button>
          ) : null
        }
      />

      <PageBody className="space-y-4">
        {page.dataset.isLoading ? (
          <div className="rounded-lg border border-border bg-card px-4 py-10">
            <LoadingText className="mx-auto">加载中</LoadingText>
          </div>
        ) : page.dataset.isError || !dataset ? (
          <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-destructive">
            数据集不存在或加载失败
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => page.setTab(tab.id)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm transition-colors",
                      page.tab === tab.id
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {page.tab === "queries" ? (
                <Button variant="primary" size="lg" onClick={page.startCreate}>
                  新建问题
                </Button>
              ) : null}
              {page.tab === "runs" ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setCreateOpen(true)}
                  disabled={!canStartEval}
                >
                  开始评测
                </Button>
              ) : null}
            </div>

            {page.tab === "queries" ? (
              <section className="space-y-2">
                <EmptyStateGuide
                  queryCount={queryCount}
                  unlabeledCount={unlabeledCount}
                  runCount={runCount}
                  onGoRuns={() => page.setTab("runs")}
                  onCreateQuery={page.startCreate}
                />
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                  <div>
                    共 {queryCount} 个问题
                    {unlabeledCount > 0 ? ` · ${unlabeledCount} 个尚未标注相关 Chunk` : ""}
                  </div>
                  <Input
                    clearable
                    value={page.search}
                    onChange={(e) => page.setSearch(e.target.value)}
                    placeholder="搜索问题/参考答案"
                  />
                </div>

                <DataTable
                  columns={page.columns}
                  data={page.filtered}
                  getRowKey={(item) => item.id}
                  loading={page.queries.isLoading}
                  error={page.queries.isError}
                  errorText="问题列表加载失败"
                  emptyText="暂无问题，先新建并标注相关 Chunk"
                />
              </section>
            ) : null}

            {page.tab === "runs" ? (
              <EvalRunHistoryPanel
                datasetId={page.datasetId}
                onStartEval={() => setCreateOpen(true)}
                canStartEval={canStartEval}
                unlabeledCount={unlabeledCount}
              />
            ) : null}

            {page.tab === "trends" ? (
              <TrendsPanel
                loading={trends.isLoading}
                error={trends.isError}
                series={trends.data?.series ?? []}
              />
            ) : null}
          </>
        )}

        <EvalQueryEditorDialog
          open={page.editorOpen}
          mode={page.editingQuery ? "edit" : "create"}
          initial={page.editingQuery}
          isSaving={page.isSaving}
          hasError={page.hasSaveError}
          errorText={page.saveErrorText}
          onCancel={page.cancelEditor}
          onSubmit={(body) => void page.submitQuery(body)}
        />

        <EvalRunCreateDialog
          open={createOpen}
          isSaving={createRun.isPending}
          hasError={createRun.isError}
          errorText={createErrorText}
          unlabeledCount={page.unlabeledCount}
          onCancel={() => {
            setCreateOpen(false)
            createRun.reset()
          }}
          onSubmit={(body) => void submitRun(body)}
        />

        <ConfirmDeleteDialog
          open={!!page.deleting}
          description={
            page.deleting
              ? `将删除问题「${
                  page.deleting.question.length > 40
                    ? `${page.deleting.question.slice(0, 40)}…`
                    : page.deleting.question
                }」，此操作不可恢复`
              : undefined
          }
          confirming={page.deletePending}
          errorText={page.deleteError ? "删除失败，请重试" : null}
          onCancel={() => page.setDeleting(null)}
          onConfirm={() => void page.confirmDelete()}
        />
      </PageBody>
    </Page>
  )
}

function EmptyStateGuide({
  queryCount,
  unlabeledCount,
  runCount,
  onGoRuns,
  onCreateQuery,
}: {
  queryCount: number
  unlabeledCount: number
  runCount: number
  onGoRuns: () => void
  onCreateQuery: () => void
}) {
  if (queryCount === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
        问题集为空。先{" "}
        <button type="button" className="text-foreground underline-offset-2 hover:underline" onClick={onCreateQuery}>
          新建问题
        </button>
        ，并标注相关 Chunk。
      </div>
    )
  }
  if (unlabeledCount > 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
        仍有 {unlabeledCount} 个问题未标注相关 Chunk，完成标注后可去运行历史开始评测。
      </div>
    )
  }
  if (runCount === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
        已有可用问题。前往{" "}
        <button type="button" className="text-foreground underline-offset-2 hover:underline" onClick={onGoRuns}>
          运行历史
        </button>{" "}
        开始评测。
      </div>
    )
  }
  if (runCount >= 2) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
        已有 {runCount} 次运行。可在运行历史勾选两次 Run 对比；候选策略胜出后去{" "}
        <Link className="text-foreground underline-offset-2 hover:underline" to="/evals/policies">
          Agent 策略中心
        </Link>{" "}
        发布。
      </div>
    )
  }
  return null
}

function TrendsPanel({
  loading,
  error,
  series,
}: {
  loading: boolean
  error: boolean
  series: Array<{
    retrieverMode: string
    topK: number
    includeGeneration: boolean
    points: Array<{
      runId: string
      name: string | null
      createdAt: string
      metrics: Record<string, unknown>
    }>
  }>
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-10">
        <LoadingText className="mx-auto">加载趋势</LoadingText>
      </div>
    )
  }
  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-destructive">
        趋势加载失败
      </div>
    )
  }
  if (!series.length) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        暂无同配置系列的历史运行，完成多次评测后可在此查看指标变化
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {series.map((item) => (
        <section
          key={`${item.retrieverMode}-${item.topK}-${item.includeGeneration}`}
          className="rounded-lg border border-border bg-card p-4 shadow-sm"
        >
          <div className="text-sm font-medium">
            {item.retrieverMode} · Top K={item.topK}
            {item.includeGeneration ? " · 含生成" : " · 仅检索"}
          </div>
          <div className="mt-3 space-y-2">
            {item.points.map((point) => (
              <div
                key={point.runId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/30 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium">{point.name || point.runId.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatEvalDateTime(point.createdAt)}
                  </div>
                </div>
                <div className="tabular-nums text-muted-foreground">
                  Recall {formatMetricNumber(point.metrics.recallAtK)} · MRR{" "}
                  {formatMetricNumber(point.metrics.mrrAtK)} · NDCG{" "}
                  {formatMetricNumber(point.metrics.ndcgAtK)}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
