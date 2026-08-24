import { useState, type ReactNode } from "react"
import type { AgentPolicyConfig, AgentPolicyListItem } from "@/api/evals"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LoadingText } from "@/components/ui/loading-text"
import { Textarea } from "@/components/ui/textarea"

type AgentPolicyEditDialogProps = {
  open: boolean
  policy: AgentPolicyListItem | null
  isLoading?: boolean
  isSaving: boolean
  errorText?: string | null
  onCancel: () => void
  onSubmit: (body: { name: string; description: string; config: AgentPolicyConfig }) => void
}

type FormState = {
  name: string
  description: string
  answerContextTopK: string
  maxToolCalls: string
  maxPlannerCalls: string
  maxToolFailureRetries: string
  minEvidenceScore: string
  plannerPrompt: string
}

type AgentPolicyFormConfig = Required<
  Pick<
    AgentPolicyConfig,
    | "answerContextTopK"
    | "maxToolCalls"
    | "maxPlannerCalls"
    | "maxToolFailureRetries"
    | "minEvidenceScore"
    | "plannerPrompt"
  >
>

const POLICY_LIMITS = {
  answerContextTopK: 50,
  maxToolCalls: 10,
  maxPlannerCalls: 20,
  maxToolFailureRetries: 3,
  minEvidenceScore: 1,
}

function toForm(policy: AgentPolicyListItem | null): FormState {
  const config = policy?.config ?? {}
  return {
    name: policy?.name ?? "",
    description: policy?.description ?? "",
    answerContextTopK: String(config.answerContextTopK ?? config.defaultTopK ?? 6),
    maxToolCalls: String(config.maxToolCalls ?? 5),
    maxPlannerCalls: String(config.maxPlannerCalls ?? 6),
    maxToolFailureRetries: String(config.maxToolFailureRetries ?? 1),
    minEvidenceScore: String(config.minEvidenceScore ?? config.evidenceVerification?.minConfidence ?? 0.15),
    plannerPrompt: String(config.plannerPrompt ?? config.promptVersions?.planner ?? ""),
  }
}

export function AgentPolicyEditDialog({
  open,
  policy,
  isLoading = false,
  isSaving,
  errorText,
  onCancel,
  onSubmit,
}: AgentPolicyEditDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
      title="编辑 Agent 策略"
      description="设置 Agent 如何检索、调用工具和判断证据。回答语气与格式由问答助手的回答提示词控制。"
      contentClassName="max-w-3xl w-full"
    >
      {isLoading ? (
        <div className="flex min-h-64 items-center justify-center">
          <LoadingText>创建策略</LoadingText>
        </div>
      ) : open ? (
        <AgentPolicyEditForm
          key={policy?.id ?? "new-draft"}
          policy={policy}
          isSaving={isSaving}
          errorText={errorText}
          onCancel={onCancel}
          onSubmit={onSubmit}
        />
      ) : null}
    </Dialog>
  )
}

function AgentPolicyEditForm({
  policy,
  isSaving,
  errorText,
  onCancel,
  onSubmit,
}: Omit<AgentPolicyEditDialogProps, "open">) {
  const [form, setForm] = useState<FormState>(() => toForm(policy))
  const config = buildConfig(form)
  const canSubmit =
    form.name.trim().length > 0 &&
    config.maxPlannerCalls >= config.maxToolCalls + 1 &&
    form.plannerPrompt.trim().length > 0

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <>
      <div className="grid max-h-[75vh] gap-5 overflow-y-auto pr-1">
        <PolicySection title="基本信息" description="用于识别策略版本，不影响运行行为。">
          <Field label="策略名称">
            <Input
              aria-label="策略名称"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              disabled={isSaving}
            />
          </Field>
          <Field label="策略说明">
            <Textarea
              aria-label="策略说明"
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              disabled={isSaving}
              rows={2}
            />
          </Field>
        </PolicySection>

        <PolicySection
          title="检索与证据"
          description="控制最终交给回答模型的上下文数量，以及证据达到什么分数才视为可用。"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="回答上下文数量">
              <Input
                aria-label="回答上下文数量"
                type="number"
                min={1}
                max={POLICY_LIMITS.answerContextTopK}
                value={form.answerContextTopK}
                onChange={(event) => update("answerContextTopK", event.target.value)}
                disabled={isSaving}
              />
            </Field>
            <Field label="最低证据分数">
              <Input
                aria-label="最低证据分数"
                type="number"
                min={0}
                max={POLICY_LIMITS.minEvidenceScore}
                step="0.01"
                value={form.minEvidenceScore}
                onChange={(event) => update("minEvidenceScore", event.target.value)}
                disabled={isSaving}
              />
            </Field>
          </div>
        </PolicySection>

        <PolicySection
          title="执行预算与失败处理"
          description="限制单次回答最多可执行的步骤。工具超时或执行失败时，Agent 会在重试预算内重新规划。"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="最大工具调用次数">
              <Input
                aria-label="最大工具调用次数"
                type="number"
                min={0}
                max={POLICY_LIMITS.maxToolCalls}
                value={form.maxToolCalls}
                onChange={(event) => update("maxToolCalls", event.target.value)}
                disabled={isSaving}
              />
            </Field>
            <Field label="最大 Planner 调用次数">
              <Input
                aria-label="最大 Planner 调用次数"
                type="number"
                min={1}
                max={POLICY_LIMITS.maxPlannerCalls}
                value={form.maxPlannerCalls}
                onChange={(event) => update("maxPlannerCalls", event.target.value)}
                disabled={isSaving}
              />
            </Field>
            <Field label="工具失败重试次数">
              <Input
                aria-label="工具失败重试次数"
                type="number"
                min={0}
                max={POLICY_LIMITS.maxToolFailureRetries}
                value={form.maxToolFailureRetries}
                onChange={(event) => update("maxToolFailureRetries", event.target.value)}
                disabled={isSaving}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                仅针对超时和执行异常；权限错误不会重试。0 表示失败后不再尝试。
              </p>
            </Field>
          </div>
          {config.maxPlannerCalls < config.maxToolCalls + 1 ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              最大 Planner 调用次数必须至少比最大工具调用次数多 1 次，以便最后结束本轮。
            </div>
          ) : null}
        </PolicySection>

        <details className="rounded-lg border border-border p-4">
          <summary className="cursor-pointer text-sm font-medium">高级设置：Planner 指令</summary>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            这里控制检索模式、工具选择和停止条件，不控制助手身份、回答语气或答案格式。一般情况下建议保留现有模板。
          </p>
          <div className="mt-3">
            <Field label="Planner 指令">
              <Textarea
                aria-label="Planner 指令"
                value={form.plannerPrompt}
                onChange={(event) => update("plannerPrompt", event.target.value)}
                disabled={isSaving}
                rows={12}
              />
            </Field>
          </div>
        </details>
      </div>

      {errorText ? <div className="mt-3 text-sm text-destructive">{errorText}</div> : null}

      <div className="mt-4 flex justify-end gap-3">
        <Button variant="dialog-cancel" size="lg" onClick={onCancel} disabled={isSaving}>
          取消
        </Button>
        <Button
          variant="primary"
          size="lg"
          disabled={!canSubmit}
          loading={isSaving}
          onClick={() =>
            onSubmit({
              name: form.name.trim(),
              description: form.description,
              config,
            })
          }
        >
          保存草稿
        </Button>
      </div>
    </>
  )
}

function PolicySection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function buildConfig(form: FormState): AgentPolicyFormConfig {
  const maxToolCalls = clampInt(form.maxToolCalls, 0, POLICY_LIMITS.maxToolCalls, 5)
  const maxPlannerCalls = clampInt(form.maxPlannerCalls, 1, POLICY_LIMITS.maxPlannerCalls, 6)
  return {
    answerContextTopK: clampInt(form.answerContextTopK, 1, POLICY_LIMITS.answerContextTopK, 6),
    maxToolCalls,
    maxPlannerCalls,
    maxToolFailureRetries: clampInt(form.maxToolFailureRetries, 0, POLICY_LIMITS.maxToolFailureRetries, 1),
    minEvidenceScore: clampFloat(form.minEvidenceScore, 0, POLICY_LIMITS.minEvidenceScore, 0.15),
    plannerPrompt: form.plannerPrompt.trim(),
  }
}

function clampInt(value: string, min: number, max: number, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(parsed)))
}

function clampFloat(value: string, min: number, max: number, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, parsed))
}
