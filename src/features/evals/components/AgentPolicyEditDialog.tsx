import { useState } from "react"
import type { AgentPolicyConfig, AgentPolicyListItem } from "@/api/evals"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type AgentPolicyEditDialogProps = {
  open: boolean
  policy: AgentPolicyListItem | null
  isSaving: boolean
  errorText?: string | null
  onCancel: () => void
  onSubmit: (body: {
    name: string
    description: string
    config: AgentPolicyConfig
  }) => void
}

type FormState = {
  name: string
  description: string
  answerContextTopK: string
  maxToolCalls: string
  maxPlannerCalls: string
  minEvidenceScore: string
  plannerPrompt: string
}

type AgentPolicyFormConfig = Required<
  Pick<
    AgentPolicyConfig,
    "answerContextTopK" | "maxToolCalls" | "maxPlannerCalls" | "minEvidenceScore" | "plannerPrompt"
  >
>

const POLICY_LIMITS = {
  answerContextTopK: 50,
  maxToolCalls: 10,
  maxPlannerCalls: 20,
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
    minEvidenceScore: String(
      config.minEvidenceScore ?? config.evidenceVerification?.minConfidence ?? 0.15,
    ),
    plannerPrompt: String(config.plannerPrompt ?? config.promptVersions?.planner ?? ""),
  }
}

export function AgentPolicyEditDialog({
  open,
  policy,
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
      title="编辑 Agent Policy"
      description="只编辑会进入运行时的 Agent 护栏与 Planner Prompt。Seed、Active 和 Archived Policy 需要先复制为 Draft。"
      contentClassName="max-w-3xl w-full"
    >
      {open ? (
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
      <div className="grid max-h-[75vh] gap-4 overflow-y-auto pr-1">
        <Field label="名称">
          <Input
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            disabled={isSaving}
          />
        </Field>

        <Field label="说明">
          <Textarea
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            disabled={isSaving}
            rows={2}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="回答上下文数量">
            <Input
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
              type="number"
              min={0}
              max={POLICY_LIMITS.minEvidenceScore}
              step="0.01"
              value={form.minEvidenceScore}
              onChange={(event) => update("minEvidenceScore", event.target.value)}
              disabled={isSaving}
            />
          </Field>

          <Field label="最大工具调用次数">
            <Input
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
              type="number"
              min={1}
              max={POLICY_LIMITS.maxPlannerCalls}
              value={form.maxPlannerCalls}
              onChange={(event) => update("maxPlannerCalls", event.target.value)}
              disabled={isSaving}
            />
          </Field>
        </div>

        <Field label="Planner Prompt">
          <Textarea
            value={form.plannerPrompt}
            onChange={(event) => update("plannerPrompt", event.target.value)}
            disabled={isSaving}
            rows={10}
          />
        </Field>

        {config.maxPlannerCalls < config.maxToolCalls + 1 ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            最大 Planner 调用次数必须至少比最大工具调用次数多 1 次。
          </div>
        ) : null}
      </div>

      {errorText ? (
        <div className="mt-3 text-sm text-destructive">{errorText}</div>
      ) : null}

      <div className="mt-4 flex justify-end gap-3">
        <Button
          variant="dialog-cancel"
          size="lg"
          onClick={onCancel}
          disabled={isSaving}
        >
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
          保存 Draft
        </Button>
      </div>
    </>
  )
}

function buildConfig(form: FormState): AgentPolicyFormConfig {
  const maxToolCalls = clampInt(form.maxToolCalls, 0, POLICY_LIMITS.maxToolCalls, 5)
  const maxPlannerCalls = clampInt(form.maxPlannerCalls, 1, POLICY_LIMITS.maxPlannerCalls, 6)
  return {
    answerContextTopK: clampInt(form.answerContextTopK, 1, POLICY_LIMITS.answerContextTopK, 6),
    maxToolCalls,
    maxPlannerCalls,
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
