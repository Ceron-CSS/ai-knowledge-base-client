import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { HttpError } from "@/api/http"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { Button } from "@/components/ui/button"
import { LoadingText } from "@/components/ui/loading-text"
import {
  useActivateAgentPolicy,
  useAgentPolicies,
  useAgentPolicyActivations,
  useCreateAgentPolicy,
} from "@/features/evals/hooks/queries"
import { formatEvalDateTime } from "@/features/evals/lib/formatDate"

type EvalAgentPolicyPanelProps = {
  highlightPolicyId?: string | null
  evidenceEvalRunId?: string | null
  /** Compact CTA pointing to the platform policy center. */
  compact?: boolean
}

export function EvalAgentPolicyPanel({
  highlightPolicyId,
  evidenceEvalRunId,
  compact = false,
}: EvalAgentPolicyPanelProps) {
  const navigate = useNavigate()
  const policies = useAgentPolicies()
  const history = useAgentPolicyActivations(!compact)
  const activate = useActivateAgentPolicy()
  const createPolicy = useCreateAgentPolicy()
  const [pendingPolicyId, setPendingPolicyId] = useState<string | null>(null)

  const pending = (policies.data ?? []).find((item) => item.id === pendingPolicyId)
  const highlighted = (policies.data ?? []).find((item) => item.id === highlightPolicyId)
  const errorText =
    createPolicy.error instanceof HttpError
      ? createPolicy.error.message
      : activate.error instanceof HttpError
      ? activate.error.message
      : activate.error instanceof Error
        ? activate.error.message
        : null

  const centerHref = highlightPolicyId
    ? `/evals/policies?highlight=${encodeURIComponent(highlightPolicyId)}`
    : "/evals/policies"

  if (compact) {
    return (
      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-medium">去 Agent Policy 发布</div>
            <p className="text-xs text-muted-foreground">
              策略发布是平台级能力。候选策略评测通过后，请在 Agent Policy 确认发布为线上
              active；历史 Run 快照不会被改写。
            </p>
            {highlighted ? (
              <div className="text-xs text-muted-foreground">
                当前候选：{highlighted.name} ({highlighted.id})
                {highlighted.status === "draft" ? " · draft" : ""}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {highlighted && highlighted.id !== "workflow-baseline-v1" ? (
              <Button
                variant="outline"
                size="sm"
                loading={createPolicy.isPending}
                onClick={() =>
                  void createPolicy.mutateAsync({
                    name: `${highlighted.name} · ${evidenceEvalRunId ? evidenceEvalRunId.slice(0, 8) : "candidate"} 草稿`,
                    sourcePolicyId: highlighted.id,
                    description: evidenceEvalRunId
                      ? `基于 candidate EvalRun ${evidenceEvalRunId} 创建，用于调整后再次验证。`
                      : "基于当前候选策略创建，用于调整后再次验证。",
                  })
                }
              >
                基于本次运行创建草稿
              </Button>
            ) : null}
            {highlighted &&
            !highlighted.isActive &&
            highlighted.id !== "workflow-baseline-v1" &&
            highlighted.status !== "archived" ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setPendingPolicyId(highlighted.id)}
                disabled={activate.isPending}
              >
                发布该策略
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => navigate(centerHref)}>
              打开 Agent Policy
            </Button>
          </div>
        </div>

        <ConfirmDeleteDialog
          open={Boolean(pendingPolicyId)}
          title="确认发布 Agent Policy"
          confirmLabel="确认发布"
          confirming={activate.isPending}
          errorText={errorText}
          onCancel={() => {
            if (!activate.isPending) setPendingPolicyId(null)
          }}
          onConfirm={async () => {
            if (!pendingPolicyId) return
            await activate.mutateAsync({
              policyId: pendingPolicyId,
              evalRunId: evidenceEvalRunId || undefined,
              note: evidenceEvalRunId ? `activated from eval run ${evidenceEvalRunId}` : undefined,
            })
            setPendingPolicyId(null)
          }}
        >
          <ReleaseGateChecklist policy={pending} evidenceEvalRunId={evidenceEvalRunId} />
        </ConfirmDeleteDialog>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Agent Policy 发布</div>
          <p className="mt-1 text-xs text-muted-foreground">
            内置 v1/v2 仅为 seed。请复制为 draft、评测对比后，在{" "}
            <Link className="text-foreground underline-offset-2 hover:underline" to="/evals/policies">
              Agent Policy
            </Link>{" "}
            发布；历史评测快照不会被改写。
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(centerHref)}>
          打开 Agent Policy
        </Button>
      </div>

      {policies.isLoading ? (
        <div className="mt-4">
          <LoadingText>加载策略</LoadingText>
        </div>
      ) : policies.isError ? (
        <div className="mt-4 text-sm text-destructive">策略列表加载失败</div>
      ) : (
        <div className="mt-4 space-y-2">
          {(policies.data ?? []).map((policy) => {
            const isHighlighted = highlightPolicyId === policy.id
            const canActivate =
              policy.id !== "workflow-baseline-v1" &&
              !policy.isActive &&
              policy.status !== "archived"
            return (
              <div
                key={policy.id}
                className={`flex flex-wrap items-start justify-between gap-3 rounded-md border px-3 py-2 ${
                  policy.isActive
                    ? "border-emerald-300/70 bg-emerald-50/40"
                    : isHighlighted
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/70"
                }`}
              >
                <div className="min-w-0 space-y-1">
                  <div className="text-sm font-medium">
                    {policy.name}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {policy.id} · {policy.version}
                      {policy.isSeed ? " · seed" : ""} · {policy.status}
                      {policy.isActive ? " · 线上 active" : ""}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{policy.description}</div>
                  {policy.activatedAt ? (
                    <div className="text-xs text-muted-foreground">
                      启用时间 {formatEvalDateTime(policy.activatedAt)}
                      {policy.evalRunId ? ` · 依据 Run ${policy.evalRunId.slice(0, 8)}` : ""}
                    </div>
                  ) : null}
                </div>
                {canActivate ? (
                  <Button
                    variant={isHighlighted ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setPendingPolicyId(policy.id)}
                    disabled={activate.isPending}
                  >
                    发布为线上
                  </Button>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {history.data && history.data.length > 0 ? (
        <div className="mt-4 border-t border-border pt-3">
          <div className="text-xs font-medium text-muted-foreground">最近发布记录</div>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {history.data.slice(0, 5).map((item) => (
              <li key={item.id}>
                {item.policyName} ({item.version || "-"}) ·{" "}
                {item.activatedAt ? formatEvalDateTime(item.activatedAt) : "-"}
                {item.isActive ? " · active" : ""}
                {item.note ? ` · ${item.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ConfirmDeleteDialog
        open={Boolean(pendingPolicyId)}
        title="确认发布 Agent Policy"
        confirmLabel="确认发布"
        confirming={activate.isPending}
        errorText={errorText}
        onCancel={() => {
          if (!activate.isPending) setPendingPolicyId(null)
        }}
        onConfirm={async () => {
          if (!pendingPolicyId) return
          await activate.mutateAsync({
            policyId: pendingPolicyId,
            evalRunId: evidenceEvalRunId || undefined,
            note: evidenceEvalRunId ? `activated from eval run ${evidenceEvalRunId}` : undefined,
          })
          setPendingPolicyId(null)
        }}
      >
        <ReleaseGateChecklist policy={pending} evidenceEvalRunId={evidenceEvalRunId} />
      </ConfirmDeleteDialog>
    </section>
  )
}

function ReleaseGateChecklist({
  policy,
  evidenceEvalRunId,
}: {
  policy?: { name: string; version: string } | null
  evidenceEvalRunId?: string | null
}) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">
        {policy
          ? `将发布「${policy.name} (${policy.version})」为线上 active policy。历史 EvalRun 的策略快照不会被改写。`
          : "将发布该策略为线上 active policy。历史 EvalRun 的策略快照不会被改写。"}
      </p>
      <div className="rounded-md border border-amber-300/60 bg-amber-50/70 p-3 text-amber-950">
        发布前请确认以下门槛已经人工检查：
      </div>
      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
        <li>已关联真实 EvalRun：{evidenceEvalRunId ? evidenceEvalRunId : "未检测到，请谨慎发布"}</li>
        <li>regressed 样本已复核，并记录退化原因。</li>
        <li>关键检索和引用指标未低于 Workflow baseline。</li>
        <li>P95 延迟、成本代理、fallback 和预算耗尽比例在可接受范围内。</li>
        <li>没有未解释的系统错误；必要时先创建新的 Draft Policy 再复跑。</li>
      </ul>
    </div>
  )
}
