import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { HttpError } from "@/api/http"
import type { AgentPolicyListItem } from "@/api/evals"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { Button } from "@/components/ui/button"
import { LoadingText } from "@/components/ui/loading-text"
import { Page, PageBody, PageHeader } from "@/components/ui/page-header"
import { AgentPolicyEditDialog } from "@/features/evals/components/AgentPolicyEditDialog"
import {
  useActivateAgentPolicy,
  useAgentPolicies,
  useAgentPolicyActivations,
  useArchiveAgentPolicy,
  useCreateAgentPolicy,
  useDuplicateAgentPolicy,
  usePatchAgentPolicy,
} from "@/features/evals/hooks/queries"
import { formatEvalDateTime } from "@/features/evals/lib/formatDate"

function statusLabel(status: string) {
  if (status === "active") return "线上 active"
  if (status === "draft") return "草稿"
  if (status === "archived") return "已归档"
  return status
}

export function AgentPolicyCenterPage() {
  const policies = useAgentPolicies()
  const history = useAgentPolicyActivations()
  const createPolicy = useCreateAgentPolicy()
  const duplicate = useDuplicateAgentPolicy()
  const patchPolicy = usePatchAgentPolicy()
  const archive = useArchiveAgentPolicy()
  const activate = useActivateAgentPolicy()

  const [editing, setEditing] = useState<AgentPolicyListItem | null>(null)
  const [pendingActivate, setPendingActivate] = useState<AgentPolicyListItem | null>(null)
  const [pendingArchive, setPendingArchive] = useState<AgentPolicyListItem | null>(null)

  const active = useMemo(
    () => (policies.data ?? []).find((item) => item.isActive) ?? null,
    [policies.data],
  )
  const drafts = useMemo(
    () => (policies.data ?? []).filter((item) => item.status === "draft"),
    [policies.data],
  )
  const archived = useMemo(
    () => (policies.data ?? []).filter((item) => item.status === "archived"),
    [policies.data],
  )

  const mutationError =
    createPolicy.error instanceof HttpError
      ? createPolicy.error.message
      : duplicate.error instanceof HttpError
        ? duplicate.error.message
        : patchPolicy.error instanceof HttpError
          ? patchPolicy.error.message
          : activate.error instanceof HttpError
            ? activate.error.message
            : archive.error instanceof HttpError
              ? archive.error.message
              : null

  return (
    <Page>
      <PageHeader
        items={[
          { label: "评测与策略", href: "/evals" },
          { label: "Agent Policy" },
        ]}
        description="平台级策略发版：复制 active/seed 为 draft，编辑护栏后评测对比，再发布为唯一线上 active。"
        actions={
          <Button
            variant="primary"
            size="lg"
            loading={createPolicy.isPending}
            onClick={() =>
              void createPolicy.mutateAsync({
                name: "新策略草稿",
                sourcePolicyId: active?.id,
              })
            }
          >
            从 active 新建草稿
          </Button>
        }
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
            <section className="rounded-lg border border-emerald-300/70 bg-emerald-50/40 p-4">
              <div className="text-sm font-medium">当前线上 active</div>
              {active ? (
                <div className="mt-2 space-y-1">
                  <div className="text-base font-medium">
                    {active.name}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      {active.id} · {active.version}
                      {active.isSeed ? " · 内置 seed" : ""}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{active.description}</p>
                  <div className="text-xs text-muted-foreground">
                    {active.activatedAt
                      ? `启用时间 ${formatEvalDateTime(active.activatedAt)}`
                      : "启用时间未知"}
                    {active.lastEvalRunId
                      ? ` · 最近评测 ${active.lastEvalRunId.slice(0, 8)}`
                      : ""}
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      loading={duplicate.isPending}
                      onClick={() =>
                        void duplicate.mutateAsync({
                          policyId: active.id,
                          name: `${active.name} (副本)`,
                        })
                      }
                    >
                      复制为草稿
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">暂无 active 策略</p>
              )}
            </section>

            <PolicySection
              title="草稿"
              emptyText="还没有草稿。可从上方 active 复制，或复制内置 seed。"
              items={drafts}
              onDuplicate={(policy) =>
                void duplicate.mutateAsync({
                  policyId: policy.id,
                  name: `${policy.name} (副本)`,
                })
              }
              onEdit={(policy) => {
                patchPolicy.reset()
                setEditing(policy)
              }}
              onActivate={(policy) => setPendingActivate(policy)}
              onArchive={(policy) => setPendingArchive(policy)}
              duplicating={duplicate.isPending}
              showSeedHint
            />

            <PolicySection
              title="已归档 / 基线"
              emptyText="暂无归档策略"
              items={archived}
              onDuplicate={(policy) =>
                void duplicate.mutateAsync({
                  policyId: policy.id,
                  name: `${policy.name} (副本)`,
                })
              }
              duplicating={duplicate.isPending}
            />

            {history.data && history.data.length > 0 ? (
              <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="text-sm font-medium">发布历史</div>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {history.data.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {item.policyName} ({item.version || "-"}) · {item.policyId}
                        {item.isActive ? " · active" : ""}
                        {item.note ? ` · ${item.note}` : ""}
                      </span>
                      <span className="text-xs">
                        {item.activatedAt ? formatEvalDateTime(item.activatedAt) : "-"}
                        {item.evalRunId ? (
                          <>
                            {" · "}
                            <Link
                              className="text-foreground underline-offset-2 hover:underline"
                              to={`/evals/runs/${item.evalRunId}`}
                            >
                              依据 Run
                            </Link>
                          </>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {mutationError ? (
              <div className="text-sm text-destructive">{mutationError}</div>
            ) : null}
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
        title="确认发布 Agent Policy"
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
              ? `将发布「${pendingActivate.name} (${pendingActivate.version})」为线上 active policy。历史评测 Run 的策略快照不会被改写。`
              : "将发布该策略为线上 active policy。历史评测 Run 的策略快照不会被改写。"}
          </p>
          <div className="rounded-md border border-amber-300/60 bg-amber-50/70 p-3 text-amber-950">
            发布前请确认关联 EvalRun 与风险门槛。
          </div>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>关联 EvalRun：{pendingActivate?.lastEvalRunId || "未检测到，非 seed 策略会被后端阻止发布"}</li>
            <li>regressed 样本已复核，且退化原因可解释。</li>
            <li>关键检索、引用支持、延迟、成本、fallback 和预算耗尽均在可接受范围内。</li>
            <li>发布后所有 auto/agent 聊天会读取新 active policy。</li>
          </ul>
        </div>
      </ConfirmDeleteDialog>

      <ConfirmDeleteDialog
        open={Boolean(pendingArchive)}
        title="确认归档策略"
        description={
          pendingArchive
            ? `归档后「${pendingArchive.name}」不可再编辑，仅保留历史。`
            : undefined
        }
        confirmLabel="确认归档"
        confirming={archive.isPending}
        errorText={
          archive.error instanceof HttpError
            ? archive.error.message
            : archive.error instanceof Error
              ? archive.error.message
              : null
        }
        onCancel={() => {
          if (!archive.isPending) setPendingArchive(null)
        }}
        onConfirm={async () => {
          if (!pendingArchive) return
          await archive.mutateAsync({ policyId: pendingArchive.id })
          setPendingArchive(null)
        }}
      />
    </Page>
  )
}

function PolicySection({
  title,
  emptyText,
  items,
  onDuplicate,
  onEdit,
  onActivate,
  onArchive,
  duplicating,
  showSeedHint,
}: {
  title: string
  emptyText: string
  items: AgentPolicyListItem[]
  onDuplicate: (policy: AgentPolicyListItem) => void
  onEdit?: (policy: AgentPolicyListItem) => void
  onActivate?: (policy: AgentPolicyListItem) => void
  onArchive?: (policy: AgentPolicyListItem) => void
  duplicating?: boolean
  showSeedHint?: boolean
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="text-sm font-medium">{title}</div>
      {showSeedHint ? (
        <p className="mt-1 text-xs text-muted-foreground">
          内置 seed（agent-policy-v1/v2、workflow-baseline）只作起点，真实发版请复制为 draft 后编辑。
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((policy) => (
            <div
              key={`${title}-${policy.id}`}
              className={`flex flex-wrap items-start justify-between gap-3 rounded-md border px-3 py-2 ${
                policy.isActive ? "border-emerald-300/70 bg-emerald-50/30" : "border-border/70"
              }`}
            >
              <div className="min-w-0 space-y-1">
                <div className="text-sm font-medium">
                  {policy.name}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {policy.id} · {policy.version} · {statusLabel(policy.status)}
                    {policy.isSeed ? " · seed" : ""}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{policy.description}</div>
                <div className="text-xs text-muted-foreground">
                  {policy.sourcePolicyId ? `来源 ${policy.sourcePolicyId} · ` : ""}
                  {policy.lastEvalRunId
                    ? `最近评测 ${policy.lastEvalRunId.slice(0, 8)}`
                    : "尚未用该策略跑过评测"}
                  {policy.updatedAt ? ` · 更新 ${formatEvalDateTime(policy.updatedAt)}` : ""}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={duplicating}
                  onClick={() => onDuplicate(policy)}
                >
                  复制
                </Button>
                {policy.editable && onEdit ? (
                  <Button variant="outline" size="sm" onClick={() => onEdit(policy)}>
                    编辑
                  </Button>
                ) : null}
                {!policy.isActive &&
                policy.id !== "workflow-baseline-v1" &&
                policy.status !== "archived" &&
                onActivate ? (
                  <Button variant="primary" size="sm" onClick={() => onActivate(policy)}>
                    发布为线上
                  </Button>
                ) : null}
                {policy.status === "draft" && !policy.isSeed && onArchive ? (
                  <Button variant="ghost" size="sm" onClick={() => onArchive(policy)}>
                    归档
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
