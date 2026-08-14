import { useMemo, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { History } from "lucide-react"
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
  const [pendingActivate, setPendingActivate] = useState<AgentPolicyListItem | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AgentPolicyListItem | null>(null)

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
              : deletePolicy.error instanceof HttpError
                ? deletePolicy.error.message
                : null

  function editAfterCreate(promise: Promise<AgentPolicyListItem>) {
    void promise.then((created) => setEditing(created))
  }

  return (
    <Page>
      <PageHeader items={[{ label: "Agent 策略" }]} />

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
                  size="sm"
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

            {mutationError ? <div className="text-sm text-destructive">{mutationError}</div> : null}
          </>
        )}
      </PageBody>

      <AgentPolicyEditDialog
        open={Boolean(editing)}
        policy={editing}
        isSaving={patchPolicy.isPending}
        errorText={
          patchPolicy.error instanceof HttpError
            ? patchPolicy.error.message
            : patchPolicy.error instanceof Error
              ? patchPolicy.error.message
              : null
        }
        onCancel={() => {
          if (!patchPolicy.isPending) setEditing(null)
        }}
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
        errorText={
          deletePolicy.error instanceof HttpError
            ? deletePolicy.error.message
            : deletePolicy.error instanceof Error
              ? deletePolicy.error.message
              : null
        }
        onCancel={() => {
          if (!deletePolicy.isPending) setPendingDelete(null)
        }}
        onConfirm={async () => {
          if (!pendingDelete) return
          await deletePolicy.mutateAsync({ policyId: pendingDelete.id })
          setPendingDelete(null)
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
    <section className="rounded-lg border border-emerald-300/70 bg-emerald-50/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">当前线上发布</div>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="历史发布"
          title="历史发布"
          aria-expanded={showHistory}
          onClick={() => setShowHistory((value) => !value)}
        >
          <History />
        </Button>
      </div>

      {active ? (
        <div className="mt-2 space-y-2">
          <div className="text-base font-medium">
            {active.name}{" "}
            <span className="text-sm font-normal text-muted-foreground">{active.version}</span>
          </div>
          <p className="text-sm text-muted-foreground">{active.description}</p>
          <div className="text-xs text-muted-foreground">
            {active.activatedAt ? `启用时间 ${formatEvalDateTime(active.activatedAt)}` : "启用时间未知"}
            {active.lastEvalRunId ? ` · 最近评测 ${active.lastEvalRunId.slice(0, 8)}` : ""}
          </div>
          <Button
            variant="outline"
            size="sm"
            loading={duplicating}
            onClick={() => onDuplicate(active)}
          >
            复制当前线上发布
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">暂无线上策略</p>
      )}

      {showHistory ? (
        <div className="mt-4 border-t border-emerald-300/70 pt-3">
          <div className="mb-2 text-sm font-medium">历史发布</div>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无发布历史</p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto pr-1 text-sm text-muted-foreground">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-300/50 bg-white/60 px-3 py-2"
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
                      variant="primary"
                      size="sm"
                      disabled={copyingHistory}
                      onClick={() => onCopyHistory(item)}
                    >
                      复制
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
      header: "策略",
      cellClassName: "w-[40%]",
      render: (policy) => <div className="truncate font-medium text-foreground">{policy.name}</div>,
    },
    {
      key: "lastEvalRunId",
      header: "最近评测",
      cellClassName: "w-[18%] text-xs text-muted-foreground",
      render: (policy) => (policy.lastEvalRunId ? policy.lastEvalRunId.slice(0, 8) : "未评测"),
    },
    {
      key: "updatedAt",
      header: "更新时间",
      cellClassName: "w-[22%] text-xs text-muted-foreground",
      render: (policy) => (policy.updatedAt ? formatEvalDateTime(policy.updatedAt) : "-"),
    },
    {
      key: "actions",
      header: "操作",
      className: "w-[20%] text-center",
      cellClassName: "w-[20%] text-center",
      render: (policy) => (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={duplicating}
            onClick={() => onDuplicate(policy)}
          >
            复制
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!policy.editable}
            onClick={() => onEdit(policy)}
          >
            编辑
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={policy.status === "archived"}
            onClick={() => onActivate(policy)}
          >
            发布
          </Button>
          <Button variant="dialog-danger" size="sm" onClick={() => onDelete(policy)}>
            删除
          </Button>
        </div>
      ),
    },
  ]

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">策略集</div>
        {actions}
      </div>
      <div className="mt-3">
        <DataTable
          columns={columns}
          data={items}
          getRowKey={(policy) => policy.id}
          emptyText="暂无自定义策略，可以新建或从历史发布复制。"
          tableClassName="min-w-[760px]"
        />
      </div>
    </section>
  )
}
