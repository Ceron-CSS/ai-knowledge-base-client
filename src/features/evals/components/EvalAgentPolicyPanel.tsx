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
  const [pendingPolicyId, setPendingPolicyId] = useState<string | null>(null)

  const pending = (policies.data ?? []).find((item) => item.id === pendingPolicyId)
  const highlighted = (policies.data ?? []).find((item) => item.id === highlightPolicyId)
  const errorText =
    activate.error instanceof HttpError
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
            <div className="text-sm font-medium">去策略中心发布</div>
            <p className="text-xs text-muted-foreground">
              策略发布是平台级能力。候选策略评测通过后，请在 Agent 策略中心确认发布为线上
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
              打开策略中心
            </Button>
          </div>
        </div>

        <ConfirmDeleteDialog
          open={Boolean(pendingPolicyId)}
          title="确认发布 Agent Policy"
          description={
            pending
              ? `该策略发布后会成为线上 active policy。所有使用 auto/agent 的聊天会读取新策略。历史评测 Run 的策略快照不会被改写。将发布「${pending.name} (${pending.version})」。`
              : undefined
          }
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
        />
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
              Agent 策略中心
            </Link>{" "}
            发布；历史评测快照不会被改写。
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(centerHref)}>
          打开策略中心
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
        description={
          pending
            ? `该策略发布后会成为线上 active policy。所有使用 auto/agent 的聊天会读取新策略。历史评测 Run 的策略快照不会被改写。将发布「${pending.name} (${pending.version})」。`
            : undefined
        }
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
      />
    </section>
  )
}
