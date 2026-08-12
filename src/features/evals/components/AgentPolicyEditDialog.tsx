import { useMemo, useState } from "react"
import type { AgentPolicyConfig, AgentPolicyListItem } from "@/api/evals"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
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

const MODE_OPTIONS = [
  { value: "auto", label: "自动选择" },
  { value: "agent", label: "智能代理" },
  { value: "workflow", label: "标准问答" },
]

const RETRIEVAL_MODES = [
  { id: "keyword", label: "keyword" },
  { id: "vector", label: "vector" },
  { id: "hybrid", label: "hybrid" },
  { id: "hybrid-rerank", label: "hybrid-rerank" },
] as const

type FormState = {
  name: string
  description: string
  defaultExecutionMode: string
  defaultTopK: string
  maxTopK: string
  maxRetrievalPasses: string
  maxToolCalls: string
  allowedModes: string[]
  rerankEnabled: boolean
  contextExpansionEnabled: boolean
  evidenceVerificationEnabled: boolean
  plannerPrompt: string
  answerPrompt: string
  evidencePrompt: string
}

function toForm(policy: AgentPolicyListItem | null): FormState {
  const config = policy?.config ?? {}
  return {
    name: policy?.name ?? "",
    description: policy?.description ?? "",
    defaultExecutionMode: String(config.defaultExecutionMode || "agent"),
    defaultTopK: String(config.defaultTopK ?? 6),
    maxTopK: String(config.maxTopK ?? 12),
    maxRetrievalPasses: String(config.maxRetrievalPasses ?? 3),
    maxToolCalls: String(config.maxToolCalls ?? 6),
    allowedModes: Array.isArray(config.allowedRetrievalModes)
      ? config.allowedRetrievalModes.map(String)
      : ["keyword", "vector", "hybrid", "hybrid-rerank"],
    rerankEnabled: Boolean(config.rerank?.enabled ?? true),
    contextExpansionEnabled: Boolean(config.contextExpansion?.enabled ?? true),
    evidenceVerificationEnabled: Boolean(config.evidenceVerification?.enabled ?? true),
    plannerPrompt: String(config.promptVersions?.planner || "planner-v1"),
    answerPrompt: String(config.promptVersions?.answer || "answer-v1"),
    evidencePrompt: String(config.promptVersions?.evidence || "evidence-v1"),
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
      title={policy ? `编辑草稿 · ${policy.id}` : "编辑草稿"}
      description="仅 draft 可编辑。种子策略请先复制。高级区只读预览合并后的护栏 JSON。"
      contentClassName="max-w-2xl"
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

  const jsonPreview = useMemo(() => {
    const config = buildConfig(form, policy?.config)
    return JSON.stringify(config, null, 2)
  }, [form, policy?.config])

  const canSubmit = form.name.trim().length > 0 && Number(form.defaultTopK) >= 1

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleMode(mode: string) {
    setForm((prev) => {
      const exists = prev.allowedModes.includes(mode)
      const next = exists
        ? prev.allowedModes.filter((item) => item !== mode)
        : [...prev.allowedModes, mode]
      return { ...prev, allowedModes: next.length > 0 ? next : prev.allowedModes }
    })
  }

  return (
    <>
      <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-1">
        <Field label="策略名称">
          <Input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            disabled={isSaving}
          />
        </Field>
        <Field label="说明">
          <Textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            disabled={isSaving}
            rows={2}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="默认执行路径">
            <Select
              value={form.defaultExecutionMode}
              onValueChange={(value) => update("defaultExecutionMode", value)}
              options={MODE_OPTIONS}
              disabled={isSaving}
            />
          </Field>
          <Field label="允许的检索模式">
            <div className="flex flex-wrap gap-2 pt-1">
              {RETRIEVAL_MODES.map((mode) => {
                const checked = form.allowedModes.includes(mode.id)
                return (
                  <button
                    key={mode.id}
                    type="button"
                    disabled={isSaving}
                    onClick={() => toggleMode(mode.id)}
                    className={`rounded-md border px-2 py-1 text-xs ${
                      checked
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {mode.label}
                  </button>
                )
              })}
            </div>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="默认 TopK">
            <Input
              type="number"
              min={1}
              max={20}
              value={form.defaultTopK}
              onChange={(e) => update("defaultTopK", e.target.value)}
              disabled={isSaving}
            />
          </Field>
          <Field label="最大 TopK">
            <Input
              type="number"
              min={1}
              max={20}
              value={form.maxTopK}
              onChange={(e) => update("maxTopK", e.target.value)}
              disabled={isSaving}
            />
          </Field>
          <Field label="最大检索轮次">
            <Input
              type="number"
              min={1}
              max={10}
              value={form.maxRetrievalPasses}
              onChange={(e) => update("maxRetrievalPasses", e.target.value)}
              disabled={isSaving}
            />
          </Field>
          <Field label="最大工具调用次数">
            <Input
              type="number"
              min={0}
              max={20}
              value={form.maxToolCalls}
              onChange={(e) => update("maxToolCalls", e.target.value)}
              disabled={isSaving}
            />
          </Field>
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <ToggleRow
            label="启用 rerank"
            checked={form.rerankEnabled}
            onChange={(value) => update("rerankEnabled", value)}
            disabled={isSaving}
          />
          <ToggleRow
            label="启用 context expansion"
            checked={form.contextExpansionEnabled}
            onChange={(value) => update("contextExpansionEnabled", value)}
            disabled={isSaving}
          />
          <ToggleRow
            label="启用 evidence verification"
            checked={form.evidenceVerificationEnabled}
            onChange={(value) => update("evidenceVerificationEnabled", value)}
            disabled={isSaving}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Planner Prompt">
            <Input
              value={form.plannerPrompt}
              onChange={(e) => update("plannerPrompt", e.target.value)}
              disabled={isSaving}
            />
          </Field>
          <Field label="Answer Prompt">
            <Input
              value={form.answerPrompt}
              onChange={(e) => update("answerPrompt", e.target.value)}
              disabled={isSaving}
            />
          </Field>
          <Field label="Evidence Prompt">
            <Input
              value={form.evidencePrompt}
              onChange={(e) => update("evidencePrompt", e.target.value)}
              disabled={isSaving}
            />
          </Field>
        </div>

        <div>
          <div className="mb-1.5 text-sm font-medium">配置 JSON 预览</div>
          <pre className="max-h-40 overflow-auto rounded-md bg-muted/40 p-3 text-xs">{jsonPreview}</pre>
        </div>
      </div>

      {errorText ? <div className="mt-3 text-sm text-destructive">{errorText}</div> : null}

      <div className="mt-4 flex justify-end gap-3">
        <Button variant="dialog-cancel" size="dialog" onClick={onCancel} disabled={isSaving}>
          取消
        </Button>
        <Button
          variant="primary"
          size="dialog"
          disabled={!canSubmit}
          loading={isSaving}
          onClick={() =>
            onSubmit({
              name: form.name.trim(),
              description: form.description,
              config: buildConfig(form, policy?.config),
            })
          }
        >
          保存草稿
        </Button>
      </div>
    </>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </label>
  )
}

function buildConfig(form: FormState, base?: AgentPolicyConfig): AgentPolicyConfig {
  const defaultTopK = Math.max(1, Math.min(20, Number(form.defaultTopK) || 6))
  const maxTopK = Math.max(defaultTopK, Math.min(20, Number(form.maxTopK) || 12))
  return {
    ...(base ?? {}),
    defaultExecutionMode: form.defaultExecutionMode,
    allowedRetrievalModes: form.allowedModes,
    defaultTopK,
    maxTopK,
    maxRetrievalPasses: Math.max(1, Math.min(10, Number(form.maxRetrievalPasses) || 3)),
    maxToolCalls: Math.max(0, Math.min(20, Number(form.maxToolCalls) || 6)),
    rerank: {
      ...(base?.rerank ?? {}),
      enabled: form.rerankEnabled,
    },
    contextExpansion: {
      ...(base?.contextExpansion ?? {}),
      enabled: form.contextExpansionEnabled,
    },
    evidenceVerification: {
      ...(base?.evidenceVerification ?? {}),
      enabled: form.evidenceVerificationEnabled,
    },
    promptVersions: {
      ...(base?.promptVersions ?? {}),
      planner: form.plannerPrompt.trim() || "planner-v1",
      answer: form.answerPrompt.trim() || "answer-v1",
      evidence: form.evidencePrompt.trim() || "evidence-v1",
    },
  }
}
