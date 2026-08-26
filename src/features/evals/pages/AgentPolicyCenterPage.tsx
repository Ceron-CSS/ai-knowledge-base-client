import { useMemo, useRef, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { Copy, History, Pencil, Rocket, Trash2 } from "lucide-react"
import { HttpError } from "@/api/http"
import type { AgentPolicyActivationHistoryItem, AgentPolicyListItem } from "@/api/evals"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { Button } from "@/components/ui/button"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { LoadingText } from "@/components/ui/loading-text"
import { Page, PageBody, PageHeader } from "@/components/ui/page-header"
import { AgentPolicyEditDialog } from "@/features/evals/components/AgentPolicyEditDialog"
import {
  useActivateAgentPolicy,
  useAgentPolicies,
  useAgentPolicyActivations,
  useCreateAgentPolicy,
  useDeleteAgentPolicy,
  useDuplicateAgentPolicy,
  useDuplicateAgentPolicyActivation,
  usePatchAgentPolicy,
} from "@/features/evals/hooks/queries"
import { formatEvalDateTime } from "@/features/evals/lib/formatDate"

export function AgentPolicyCenterPage() {
  const policies = useAgentPolicies()
  const history = useAgentPolicyActivations()
  const createPolicy = useCreateAgentPolicy()
  const duplicate = useDuplicateAgentPolicy()
  const duplicateRelease = useDuplicateAgentPolicyActivation()
  const patchPolicy = usePatchAgentPolicy()
  const deletePolicy = useDeleteAgentPolicy()
  const activate = useActivateAgentPolicy()

  const [editing, setEditing] = useState<AgentPolicyListItem | null>(null)
  const [isOpeningEditor, setIsOpeningEditor] = useState(false)
  const [pendingActivate, setPendingActivate] = useState<AgentPolicyListItem | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AgentPolicyListItem | null>(null)
  const editorRequestRef = useRef(0)

  const active = useMemo(
    () => (policies.data ?? []).find((item) => item.isActive) ?? null,
    [policies.data],
  )
  const strategySet = useMemo(
    () => (policies.data ?? []).filter((item) => !item.isSeed && !item.isActive),
    [policies.data],
  )

  const mutationError =
    createPolicy.error instanceof HttpError
      ? createPolicy.error.message
      : duplicate.error instanceof HttpError
        ? duplicate.error.message
        : duplicateRelease.error instanceof HttpError
          ? duplicateRelease.error.message
          : patchPolicy.error instanceof HttpError
            ? patchPolicy.error.message
            : activate.error instanceof HttpError
              ? activate.error.message
              : null

  function editAfterCreate(promise: Promise<AgentPolicyListItem>) {
    const requestId = editorRequestRef.current + 1
    editorRequestRef.current = requestId
    patchPolicy.reset()
    setEditing(null)
    setIsOpeningEditor(true)
    void promise.then(
      (created) => {
        if (editorRequestRef.current !== requestId) return
        setEditing(created)
        setIsOpeningEditor(false)
      },
      () => {
        if (editorRequestRef.current !== requestId) return
        setIsOpeningEditor(false)
      },
    )
  }

  function closeEditor() {
    if (patchPolicy.isPending) return
    editorRequestRef.current += 1
    setEditing(null)
    setIsOpeningEditor(false)
  }

  return (
    <Page>
      <PageHeader
        items={[{ label: "Agent 策略" }]}
        description="管理 Agent 的检索、工具调用和证据判断策略。助手身份、语气与回答格式在问答助手中配置。"
      />

      <PageBody className="space-y-4">
        {policies.isLoading ? (
          <div className="rounded-lg border border-border bg-card px-4 py-10">
            <LoadingText className="mx-auto">加载策略</LoadingText>
          </div>
        ) : policies.isError ? (
          <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-destructive">
            策略列表加载失败
          </div>
        ) : (
          <>
            {mutationError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                操作失败：{mutationError}
              </div>
            ) : null}
            <CurrentReleaseCard
              active={active}
              history={history.data ?? []}
              duplicating={duplicate.isPending}
              copyingHistory={duplicateRelease.isPending}
              onDuplicate={(policy) =>
                editAfterCreate(
                  duplicate.mutateAsync({
                    policyId: policy.id,
                    name: `${policy.name} 副本`,
                  }),
                )
              }
              onCopyHistory={(item) =>
                editAfterCreate(
                  duplicateRelease.mutateAsync({
                    activationId: item.id,
                    name: `${item.policyName} 复刻`,
                  }),
                )
              }
            />

            <StrategySetTable
              items={strategySet}
              duplicating={duplicate.isPending}
              actions={
                <Button
                  variant="primary"
                  size="lg"
                  loading={createPolicy.isPending}
                  onClick={() =>
                    editAfterCreate(
                      createPolicy.mutateAsync({
                        name: "新 Agent 策略",
                        sourcePolicyId: active?.id,
                      }),
                    )
                  }
                >
                  新建策略
                </Button>
              }
              onDuplicate={(policy) =>
                editAfterCreate(
                  duplicate.mutateAsync({
                    policyId: policy.id,
                    name: `${policy.name} 副本`,
                  }),
                )
              }
              onEdit={(policy) => {
                patchPolicy.reset()
                setEditing(policy)
              }}
              onActivate={(policy) => setPendingActivate(policy)}
              onDelete={(policy) => setPendingDelete(policy)}
            />
          </>
        )}
      </PageBody>

      <AgentPolicyEditDialog
        open={isOpeningEditor || Boolean(editing)}
        policy={editing}
        isLoading={isOpeningEditor && !editing}
        isSaving={patchPolicy.isPending}
        errorText={
          patchPolicy.error instanceof HttpError
            ? patchPolicy.error.message
            : patchPolicy.error instanceof Error
              ? patchPolicy.error.message
              : null
        }
        onCancel={closeEditor}
        onSubmit={async (body) => {
          if (!editing) return
          await patchPolicy.mutateAsync({ policyId: editing.id, body })
          setEditing(null)
        }}
      />

      <ConfirmDeleteDialog
        open={Boolean(pendingActivate)}
        title="确认发布 Agent 策略"
        confirmLabel="确认发布"
        confirming={activate.isPending}
        errorText={
          activate.error instanceof HttpError
            ? activate.error.message
            : activate.error instanceof Error
              ? activate.error.message
              : null
        }
        onCancel={() => {
          if (!activate.isPending) setPendingActivate(null)
        }}
        onConfirm={async () => {
          if (!pendingActivate) return
          await activate.mutateAsync({
            policyId: pendingActivate.id,
            evalRunId: pendingActivate.lastEvalRunId || undefined,
            note: pendingActivate.lastEvalRunId
              ? `activated from eval run ${pendingActivate.lastEvalRunId}`
              : "activated from policy center",
          })
          setPendingActivate(null)
        }}
      >
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {pendingActivate
              ? `将发布「${pendingActivate.name}」为线上 Agent 策略。历史评测 Run 的策略快照不会被改写。`
              : "将发布该策略为线上 Agent 策略。历史评测 Run 的策略快照不会被改写。"}
          </p>
          <div className="rounded-md border border-amber-300/60 bg-amber-50/70 p-3 text-amber-950">
            发布前请确认关联 EvalRun 与风险门槛。
          </div>
        </div>
      </ConfirmDeleteDialog>

      <ConfirmDeleteDialog
        open={Boolean(pendingDelete)}
        title="删除策略"
        description={
          pendingDelete
            ? `删除「${pendingDelete.name}」。已有 EvalRun 和发布历史会继续保留快照，不会被改写。`
            : undefined
        }
        confirmLabel="确认删除"
        confirming={deletePolicy.isPending}
        onCancel={() => {
          if (!deletePolicy.isPending) setPendingDelete(null)
        }}
        onConfirm={async () => {
          if (!pendingDelete) return
          const policyId = pendingDelete.id
          setPendingDelete(null)
          try {
            await deletePolicy.mutateAsync({ policyId })
          } catch {
            // Error toast is handled by the delete mutation.
          }
        }}
      />
    </Page>
  )
}

function CurrentReleaseCard({
  active,
  history,
  duplicating,
  copyingHistory,
  onDuplicate,
  onCopyHistory,
}: {
  active: AgentPolicyListItem | null
  history: AgentPolicyActivationHistoryItem[]
  duplicating?: boolean
  copyingHistory?: boolean
  onDuplicate: (policy: AgentPolicyListItem) => void
  onCopyHistory: (item: AgentPolicyActivationHistoryItem) => void
}) {
  const [showHistory, setShowHistory] = useState(false)

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" />
          <div>
            <div className="text-sm font-medium">当前线上策略</div>
            <div className="mt-0.5 text-xs text-muted-foreground">线上 Agent 正在使用的执行策略</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="default"
          aria-label={showHistory ? "收起发布历史" : "展开发布历史"}
          aria-expanded={showHistory}
          onClick={() => setShowHistory((value) => !value)}
        >
          <History />
          发布历史
        </Button>
      </div>

      {active ? (
        <div className="border-t border-border px-4 py-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(240px,0.8fr)_minmax(0,2fr)] xl:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate text-lg font-semibold text-foreground">{active.name}</div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  使用中
                </span>
              </div>
              <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted-foreground">
                {active.description || "暂无策略说明"}
              </p>
            </div>
            <PolicyConfigSummary policy={active} />
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span>
                启用时间：{active.activatedAt ? formatEvalDateTime(active.activatedAt) : "未知"}
              </span>
              <span>最近评测：{active.lastEvalRunId ? active.lastEvalRunId.slice(0, 8) : "未评测"}</span>
            </div>
            <Button
              variant="outline"
              size="default"
              loading={duplicating}
              onClick={() => onDuplicate(active)}
            >
              <Copy />
              复制为新草稿
            </Button>
          </div>
        </div>
      ) : (
        <p className="border-t border-border px-4 py-8 text-center text-sm text-muted-foreground">
          暂无线上策略
        </p>
      )}

      {showHistory ? (
        <div className="border-t border-border bg-muted/15 px-4 py-4">
          <div className="mb-2 text-sm font-medium">历史发布</div>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无发布历史</p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto pr-1 text-sm text-muted-foreground">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
                >
                  <span>
                    {item.policyName} · {item.policyId}
                    {item.isActive ? " · 当前线上" : ""}
                    {item.note ? ` · ${item.note}` : ""}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-xs">
                    <span>{item.activatedAt ? formatEvalDateTime(item.activatedAt) : "-"}</span>
                    {item.evalRunId ? (
                      <Link
                        className="text-foreground underline-offset-2 hover:underline"
                        to={`/evals/runs/${item.evalRunId}`}
                      >
                        依据 Run
                      </Link>
                    ) : null}
                    <Button
                      variant="outline"
                      size="default"
                      disabled={copyingHistory}
                      onClick={() => onCopyHistory(item)}
                    >
                      <Copy />
                      复制为草稿
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  )
}

function StrategySetTable({
  items,
  duplicating,
  actions,
  onDuplicate,
  onEdit,
  onActivate,
  onDelete,
}: {
  items: AgentPolicyListItem[]
  duplicating?: boolean
  actions?: ReactNode
  onDuplicate: (policy: AgentPolicyListItem) => void
  onEdit: (policy: AgentPolicyListItem) => void
  onActivate: (policy: AgentPolicyListItem) => void
  onDelete: (policy: AgentPolicyListItem) => void
}) {
  const columns: Array<DataTableColumn<AgentPolicyListItem>> = [
    {
      key: "name",
      header: "策略名称",
      cellClassName: "w-[25%]",
      render: (policy) => (
        <div className="min-w-0">
          <Button
            variant="ghost"
            className="h-auto max-w-[18rem] truncate px-0 font-medium text-foreground hover:bg-transparent hover:text-primary"
            onClick={() => onEdit(policy)}
            title={policy.name}
          >
            {policy.name}
          </Button>
          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {policy.description || "暂无说明"}
          </div>
        </div>
      ),
    },
    {
      key: "guardrails",
      header: "执行护栏",
      cellClassName: "w-[25%] text-xs text-muted-foreground",
      render: (policy) => <PolicyConfigSummary policy={policy} compact />,
    },
    {
      key: "lastEvalRunId",
      header: "最近评测",
      cellClassName: "w-[12%] text-xs text-muted-foreground",
      render: (policy) => (policy.lastEvalRunId ? policy.lastEvalRunId.slice(0, 8) : "未评测"),
    },
    {
      key: "updatedAt",
      header: "更新时间",
      cellClassName: "w-[18%] text-xs text-muted-foreground",
      render: (policy) => (policy.updatedAt ? formatEvalDateTime(policy.updatedAt) : "-"),
    },
    {
      key: "actions",
      header: "操作",
      className: "w-[20%] text-center",
      cellClassName: "w-[20%] text-center",
      render: (policy) => (
        <div className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-foreground/80 hover:bg-primary/10 hover:text-primary"
            disabled={duplicating}
            onClick={() => onDuplicate(policy)}
            title="复制策略"
            aria-label="复制策略"
          >
            <Copy />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-foreground/80 hover:bg-primary/10 hover:text-primary"
            disabled={!policy.editable}
            onClick={() => onEdit(policy)}
            title="编辑策略"
            aria-label="编辑策略"
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-foreground/80 hover:bg-primary/10 hover:text-primary"
            disabled={policy.status === "archived"}
            onClick={() => onActivate(policy)}
            title="发布策略"
            aria-label="发布策略"
          >
            <Rocket />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-foreground/80 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(policy)}
            title="删除策略"
            aria-label="删除策略"
          >
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <section className="space-y-2">
      <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>共 {items.length} 个自定义策略</div>
        {actions}
      </div>
      <DataTable
        columns={columns}
        data={items}
        getRowKey={(policy) => policy.id}
        emptyText="暂无自定义策略，可以新建或从历史发布复制。"
        tableClassName="min-w-[980px]"
      />
    </section>
  )
}

function PolicyConfigSummary({
  policy,
  compact = false,
}: {
  policy: AgentPolicyListItem
  compact?: boolean
}) {
  const config = policy.config ?? {}
  const topK = config.answerContextTopK ?? config.defaultTopK ?? "-"
  const maxTools = config.maxToolCalls ?? "-"
  const maxPlanner = config.maxPlannerCalls ?? "-"
  const retries = config.maxToolFailureRetries ?? 1
  const evidence =
    config.minEvidenceScore ?? config.evidenceVerification?.minConfidence ?? "-"

  if (compact) {
    return (
      <span className="leading-5">
        上下文 {topK} · 工具 {maxTools} · Planner {maxPlanner}
        <br />
        失败重试 {retries} · 证据分数 {evidence}
      </span>
    )
  }

  const metrics = [
    { label: "回答上下文", value: topK, suffix: "个" },
    { label: "工具调用上限", value: maxTools, suffix: "次" },
    { label: "Planner 上限", value: maxPlanner, suffix: "次" },
    { label: "失败重试", value: retries, suffix: "次" },
    { label: "最低证据分数", value: evidence, suffix: "" },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-md border border-border bg-muted/20 px-3 py-2.5">
          <div className="text-xs text-muted-foreground">{metric.label}</div>
          <div className="mt-1 text-base font-semibold tabular-nums text-foreground">
            {metric.value}
            {metric.value !== "-" ? (
              <span className="ml-0.5 text-xs font-normal text-muted-foreground">{metric.suffix}</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
