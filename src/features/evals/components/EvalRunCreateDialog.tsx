import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  listAgentPolicies,
  type EvalExecutionMode,
  type EvalRunCreateBody,
} from "@/api/evals"
import { listModelConfigs } from "@/api/models"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { DEFAULT_BASE_MODEL, getBaseModelOptionsForProvider } from "@/features/assistants/constants/baseModelOptions"

type EvalRunCreateDialogProps = {
  open: boolean
  isSaving: boolean
  hasError: boolean
  errorText?: string | null
  unlabeledCount: number
  onCancel: () => void
  onSubmit: (body: EvalRunCreateBody) => void
}

const RETRIEVER_OPTIONS = [
  { value: "hybrid", label: "混合召回（向量 + 关键词）" },
  { value: "hybrid-rerank", label: "混合召回 + 重排" },
  { value: "vector", label: "向量召回" },
  { value: "vector-rerank", label: "向量召回 + 重排" },
  { value: "keyword", label: "关键词召回" },
  { value: "keyword-rerank", label: "关键词召回 + 重排" },
]

const EXECUTION_OPTIONS = [
  { value: "workflow", label: "固定流程基线" },
  { value: "agent", label: "Agent 策略评测" },
]

export function EvalRunCreateDialog({
  open,
  isSaving,
  hasError,
  errorText,
  unlabeledCount,
  onCancel,
  onSubmit,
}: EvalRunCreateDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
      title="开始一次评测"
      description="创建一次 Run 并进入排队，由评测 Worker 异步执行；刷新页面不会中断任务"
    >
      {open ? (
        <EvalRunCreateForm
          key="eval-run-create"
          isSaving={isSaving}
          hasError={hasError}
          errorText={errorText}
          unlabeledCount={unlabeledCount}
          onCancel={onCancel}
          onSubmit={onSubmit}
        />
      ) : null}
    </Dialog>
  )
}

function EvalRunCreateForm({
  isSaving,
  hasError,
  errorText,
  unlabeledCount,
  onCancel,
  onSubmit,
}: Omit<EvalRunCreateDialogProps, "open">) {
  const [executionMode, setExecutionMode] =
    useState<EvalExecutionMode>("workflow")
  const [retrieverMode, setRetrieverMode] = useState("hybrid")
  const [topK, setTopK] = useState("6")
  const [modelConfigId, setModelConfigId] = useState("")
  const [baseModel, setBaseModel] = useState(DEFAULT_BASE_MODEL)
  const [agentPolicyId, setAgentPolicyId] = useState("")
  const [includeFaithfulness, setIncludeFaithfulness] = useState(false)
  const [includeAnswerRelevancy, setIncludeAnswerRelevancy] = useState(false)
  const [includeCitationSupport, setIncludeCitationSupport] = useState(false)

  const modelConfigs = useQuery({
    queryKey: ["model-configs", "eval-run-create"],
    queryFn: listModelConfigs,
  })

  const policies = useQuery({
    queryKey: ["evals", "agent-policies"],
    queryFn: listAgentPolicies,
  })

  const modelConfigMap = useMemo(
    () => new Map((modelConfigs.data ?? []).map((item) => [item.id, item])),
    [modelConfigs.data]
  )

  const modelConfigOptions = useMemo(
    () =>
      (modelConfigs.data ?? []).map((item) => ({
        value: item.id,
        label:
          item.provider === "deepseek"
            ? "DeepSeek"
            : item.provider === "openai"
              ? "OpenAI"
              : "百炼",
      })),
    [modelConfigs.data]
  )

  const resolvedModelConfigId = modelConfigId || modelConfigOptions[0]?.value || ""
  const selectedProvider = resolvedModelConfigId
    ? (modelConfigMap.get(resolvedModelConfigId)?.provider ?? "aliyun-bailian")
    : "aliyun-bailian"
  const baseModelOptions = getBaseModelOptionsForProvider(selectedProvider)
  const resolvedBaseModel = baseModelOptions.some((item) => item.value === baseModel)
    ? baseModel
    : (baseModelOptions[0]?.value ?? "")

  const policyOptions = useMemo(() => {
    const items = policies.data ?? []
    const selectable = items.filter((p) => !p.isSeed || p.isActive)
    const activePolicy = items.find((p) => p.isActive)
    const preferred =
      executionMode === "workflow"
        ? selectable.filter((p) => p.id.startsWith("workflow-"))
        : selectable.filter(
            (p) => p.id.startsWith("agent-") || p.status === "active"
          )
    const source = (preferred.length > 0 ? preferred : selectable).filter(
      (p) => !p.isActive
    )
    const currentPolicyLabel = activePolicy
      ? `当前线上策略（${activePolicy.name}）`
      : "当前线上策略"
    return [
      { value: "", label: currentPolicyLabel },
      ...source.map((p) => ({
        value: p.id,
        label: p.name,
      })),
    ]
  }, [policies.data, executionMode])

  const includeGeneration = true
  const needsPolicy = executionMode === "agent"
  const showFixedRetriever = executionMode === "workflow"
  const canSubmit =
    unlabeledCount === 0 &&
    (!showFixedRetriever || Number(topK) >= 1) &&
    Boolean(resolvedModelConfigId) &&
    Boolean(resolvedBaseModel)

  function handleSubmit() {
    if (!canSubmit) return
    const parsedTopK = Math.max(1, Math.min(20, Number(topK) || 6))
    onSubmit({
      executionMode,
      retrieverMode,
      includeGeneration,
      modelConfigId: resolvedModelConfigId,
      baseModel: resolvedBaseModel,
      agentPolicyId: needsPolicy && agentPolicyId ? agentPolicyId : undefined,
      topK: showFixedRetriever ? parsedTopK : undefined,
      includeFaithfulness: includeGeneration ? includeFaithfulness : false,
      includeAnswerRelevancy: includeGeneration
        ? includeAnswerRelevancy
        : false,
      includeCitationSupport: includeGeneration
        ? includeCitationSupport
        : false,
    })
  }

  return (
    <>
      <div className="grid gap-4">
        {unlabeledCount > 0 ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            仍有 {unlabeledCount} 个问题未标注相关
            Chunk，请先完成标签再运行评测。
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">评测目标</label>
            <Select
              value={executionMode}
              onValueChange={(value) => {
                setExecutionMode(value as EvalExecutionMode)
                setAgentPolicyId("")
              }}
              options={EXECUTION_OPTIONS}
              disabled={isSaving}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              固定流程用于基线对照；Agent 策略评测会运行 Agent Runtime 并冻结策略快照。
            </p>
          </div>
          {showFixedRetriever ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                召回与排序
              </label>
              <Select
                value={retrieverMode}
                onValueChange={setRetrieverMode}
                options={RETRIEVER_OPTIONS}
                disabled={isSaving}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                重排是候选召回后的排序步骤，可与混合、向量或关键词召回组合。
              </p>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                候选策略
              </label>
              <Select
                value={agentPolicyId}
                onValueChange={setAgentPolicyId}
                options={policyOptions}
                disabled={isSaving || policies.isLoading}
                placeholder={policies.isLoading ? "加载策略…" : "选择策略"}
              />
            </div>
          )}
        </div>

        <div className={showFixedRetriever ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
          {showFixedRetriever ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Top K</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={topK}
                onChange={(e) => setTopK(e.target.value)}
                disabled={isSaving}
              />
            </div>
          ) : null}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              模型配置
            </label>
            <Select
              value={resolvedModelConfigId}
              onValueChange={setModelConfigId}
              options={modelConfigOptions}
              disabled={isSaving || modelConfigs.isLoading || !modelConfigOptions.length}
              placeholder={
                modelConfigs.isLoading
                  ? "加载模型配置…"
                  : modelConfigOptions.length
                    ? "请选择模型配置"
                    : "暂无可用模型配置"
              }
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">基础模型</label>
          <Select
            value={resolvedBaseModel}
            onValueChange={setBaseModel}
            options={baseModelOptions}
            disabled={isSaving || !resolvedModelConfigId}
          />
        </div>

        {includeGeneration ? (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="text-sm font-medium">
              答案质量评测（可选）
            </div>
            <JudgeToggle
              label="事实一致性"
              checked={includeFaithfulness}
              onChange={setIncludeFaithfulness}
              disabled={isSaving}
            />
            <JudgeToggle
              label="回答相关性"
              checked={includeAnswerRelevancy}
              onChange={setIncludeAnswerRelevancy}
              disabled={isSaving}
            />
            <JudgeToggle
              label="引用支撑"
              checked={includeCitationSupport}
              onChange={setIncludeCitationSupport}
              disabled={isSaving}
            />
          </div>
        ) : null}
      </div>

      {hasError ? (
        <div className="mt-3 text-sm text-destructive">
          {errorText || "创建失败，请稍后重试"}
        </div>
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
          onClick={handleSubmit}
          disabled={!canSubmit}
          loading={isSaving}
        >
          开始评测
        </Button>
      </div>
    </>
  )
}

function JudgeToggle({
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
