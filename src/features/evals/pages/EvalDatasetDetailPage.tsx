import { useState } from "react"
import { useNavigate } from "react-router-dom"
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
import { useCreateEvalRun, useEvalRuns } from "@/features/evals/hooks/queries"

const TABS: Array<{ id: EvalDetailTab; label: string }> = [
  { id: "queries", label: "问题集" },
  { id: "runs", label: "运行历史" },
]

export function EvalDatasetDetailPage() {
  const navigate = useNavigate()
  const page = useEvalDatasetDetailPage()
  const dataset = page.dataset.data
  const createRun = useCreateEvalRun(page.datasetId)
  const runs = useEvalRuns(
    page.datasetId,
    { page: 1, pageSize: 1 },
    Boolean(dataset)
  )

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
          { label: "评测数据集", href: "/evals" },
          {
            label:
              dataset?.name || (page.dataset.isLoading ? "加载中…" : "数据集"),
          },
        ]}
        description={
          dataset?.description ||
          "维护评测问题、参考答案与相关 Chunk 标签；策略发布请前往 Agent 策略"
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
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
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
                    {unlabeledCount > 0
                      ? ` · ${unlabeledCount} 个尚未标注相关 Chunk`
                      : ""}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      clearable
                      value={page.search}
                      onChange={(e) => page.setSearch(e.target.value)}
                      placeholder="搜索问题/参考答案"
                    />
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={page.startCreate}
                    >
                      新建问题
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => setCreateOpen(true)}
                      disabled={!canStartEval}
                    >
                      开始评测
                    </Button>
                  </div>
                </div>

                <DataTable
                  columns={page.columns}
                  data={page.pagedQueries}
                  getRowKey={(item) => item.id}
                  loading={page.queries.isLoading}
                  error={page.queries.isError}
                  pagination={page.queryPagination}
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
        <button
          type="button"
          className="text-foreground underline-offset-2 hover:underline"
          onClick={onCreateQuery}
        >
          新建问题
        </button>
        ，并标注相关 Chunk。
      </div>
    )
  }
  if (unlabeledCount > 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
        仍有 {unlabeledCount} 个问题未标注相关
        Chunk，完成标注后可去运行历史开始评测。
      </div>
    )
  }
  if (runCount === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
        已有可用问题。前往{" "}
        <button
          type="button"
          className="text-foreground underline-offset-2 hover:underline"
          onClick={onGoRuns}
        >
          运行历史
        </button>{" "}
        开始评测。
      </div>
    )
  }
  return null
}
