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
  maxPlannerCalls: string
  defaultRetrieverMode: string
  allowedModes: string[]
  rerankEnabled: boolean
  rerankMaxCandidates: string
  rerankMaxReranked: string
  contextExpansionEnabled: boolean
  contextMaxNeighborChunks: string
  contextMaxChunksPerDocument: string
  evidenceVerificationEnabled: boolean
  evidenceMinConfidence: string
  evidenceAllowNoAnswer: boolean
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
    maxPlannerCalls: String(config.maxPlannerCalls ?? 6),
    defaultRetrieverMode: String(config.defaultRetrieverMode || "hybrid"),
    allowedModes: Array.isArray(config.allowedRetrievalModes)
      ? config.allowedRetrievalModes.map(String)
      : ["keyword", "vector", "hybrid", "hybrid-rerank"],
    rerankEnabled: Boolean(config.rerank?.enabled ?? true),
    rerankMaxCandidates: String(config.rerank?.maxCandidates ?? 30),
    rerankMaxReranked: String(config.rerank?.maxReranked ?? 12),
    contextExpansionEnabled: Boolean(config.contextExpansion?.enabled ?? true),
    contextMaxNeighborChunks: String(
      config.contextExpansion?.maxNeighborChunks ?? 2
    ),
    contextMaxChunksPerDocument: String(
      config.contextExpansion?.maxChunksPerDocument ?? 3
    ),
    evidenceVerificationEnabled: Boolean(
      config.evidenceVerification?.enabled ?? true
    ),
    evidenceMinConfidence: String(
      config.evidenceVerification?.minConfidence ?? 0.35
    ),
    evidenceAllowNoAnswer: Boolean(
      config.evidenceVerification?.allowNoAnswer ?? true
    ),
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
      title="编辑策略"
      description="仅 draft 可编辑。种子策略请先复制。高级区只读预览合并后的护栏 JSON。"
      contentClassName="max-w-5xl w-full"
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
      return {
        ...prev,
        allowedModes: next.length > 0 ? next : prev.allowedModes,
      }
    })
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-h-[75vh] md:max-h-none overflow-y-auto md:overflow-visible pr-1 md:pr-0">
        <div className="md:col-span-7 flex flex-col gap-4 md:overflow-y-auto md:max-h-[65vh] md:pr-2">
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
            <Field label="默认检索模式">
              <Select
                value={form.defaultRetrieverMode}
                onValueChange={(value) => update("defaultRetrieverMode", value)}
                options={RETRIEVAL_MODES.map((mode) => ({
                  value: mode.id,
                  label: mode.label,
                }))}
                disabled={isSaving}
              />
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
            <Field label="最大 Planner 调用次数">
              <Input
                type="number"
                min={1}
                max={20}
                value={form.maxPlannerCalls}
                onChange={(e) => update("maxPlannerCalls", e.target.value)}
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
            {form.rerankEnabled ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Rerank 候选数">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={form.rerankMaxCandidates}
                    onChange={(e) =>
                      update("rerankMaxCandidates", e.target.value)
                    }
                    disabled={isSaving}
                  />
                </Field>
                <Field label="Rerank 结果数">
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={form.rerankMaxReranked}
                    onChange={(e) => update("rerankMaxReranked", e.target.value)}
                    disabled={isSaving}
                  />
                </Field>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <ToggleRow
              label="启用 context expansion"
              checked={form.contextExpansionEnabled}
              onChange={(value) => update("contextExpansionEnabled", value)}
              disabled={isSaving}
            />
            {form.contextExpansionEnabled ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="相邻 Chunks 数">
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={form.contextMaxNeighborChunks}
                    onChange={(e) =>
                      update("contextMaxNeighborChunks", e.target.value)
                    }
                    disabled={isSaving}
                  />
                </Field>
                <Field label="单文档最大 Chunks 数">
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={form.contextMaxChunksPerDocument}
                    onChange={(e) =>
                      update("contextMaxChunksPerDocument", e.target.value)
                    }
                    disabled={isSaving}
                  />
                </Field>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <ToggleRow
              label="启用 evidence verification"
              checked={form.evidenceVerificationEnabled}
              onChange={(value) => update("evidenceVerificationEnabled", value)}
              disabled={isSaving}
            />
            {form.evidenceVerificationEnabled ? (
              <div className="grid gap-3">
                <ToggleRow
                  label="允许无答案"
                  checked={form.evidenceAllowNoAnswer}
                  onChange={(value) => update("evidenceAllowNoAnswer", value)}
                  disabled={isSaving}
                />
                <Field label="Evidence 最小置信度">
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step="0.01"
                    value={form.evidenceMinConfidence}
                    onChange={(e) =>
                      update("evidenceMinConfidence", e.target.value)
                    }
                    disabled={isSaving}
                  />
                </Field>
              </div>
            ) : null}
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
        </div>

        <div className="md:col-span-5 flex flex-col md:max-h-[65vh]">
          <div className="mb-1.5 text-sm font-medium">配置 JSON 预览</div>
          <pre className="flex-1 overflow-auto rounded-md bg-muted/40 p-3 text-xs font-mono border border-border h-48 md:h-full">
            {jsonPreview}
          </pre>
        </div>
      </div>

      {errorText ? (
        <div className="mt-3 text-sm text-destructive">{errorText}</div>
      ) : null}

      <div className="mt-4 flex justify-end gap-3">
        <Button
          variant="dialog-cancel"
          size="dialog"
          onClick={onCancel}
          disabled={isSaving}
        >
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
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </label>
  )
}

function buildConfig(
  form: FormState,
  base?: AgentPolicyConfig
): AgentPolicyConfig {
  const defaultTopK = Math.max(1, Math.min(20, Number(form.defaultTopK) || 6))
  const maxTopK = Math.max(
    defaultTopK,
    Math.min(20, Number(form.maxTopK) || 12)
  )
  return {
    ...(base ?? {}),
    defaultExecutionMode: form.defaultExecutionMode,
    allowedRetrievalModes: form.allowedModes,
    defaultTopK,
    maxTopK,
    maxRetrievalPasses: Math.max(
      1,
      Math.min(10, Number(form.maxRetrievalPasses) || 3)
    ),
    maxToolCalls: Math.max(0, Math.min(20, Number(form.maxToolCalls) || 6)),
    maxPlannerCalls: Math.max(
      1,
      Math.min(20, Number(form.maxPlannerCalls) || 6)
    ),
    defaultRetrieverMode: form.defaultRetrieverMode,
    rerank: {
      ...(base?.rerank ?? {}),
      enabled: form.rerankEnabled,
      maxCandidates: Math.max(
        1,
        Math.min(100, Number(form.rerankMaxCandidates) || 30)
      ),
      maxReranked: Math.max(
        1,
        Math.min(50, Number(form.rerankMaxReranked) || 12)
      ),
    },
    contextExpansion: {
      ...(base?.contextExpansion ?? {}),
      enabled: form.contextExpansionEnabled,
      maxNeighborChunks: Math.max(
        0,
        Math.min(10, Number(form.contextMaxNeighborChunks) || 0)
      ),
      maxChunksPerDocument: Math.max(
        1,
        Math.min(20, Number(form.contextMaxChunksPerDocument) || 3)
      ),
    },
    evidenceVerification: {
      ...(base?.evidenceVerification ?? {}),
      enabled: form.evidenceVerificationEnabled,
      minConfidence: Math.max(
        0,
        Math.min(1, Number(form.evidenceMinConfidence) || 0)
      ),
      allowNoAnswer: form.evidenceAllowNoAnswer,
    },
    promptVersions: {
      ...(base?.promptVersions ?? {}),
      planner: form.plannerPrompt.trim() || "planner-v1",
      answer: form.answerPrompt.trim() || "answer-v1",
      evidence: form.evidencePrompt.trim() || "evidence-v1",
    },
  }
}
