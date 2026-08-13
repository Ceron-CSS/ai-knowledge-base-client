import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { listAgentPolicies, type EvalExecutionMode, type EvalRunCreateBody } from "@/api/evals"
import { listAssistants } from "@/api/assistants"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

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
  { value: "hybrid", label: "混合检索" },
  { value: "hybrid-rerank", label: "混合 + 重排" },
  { value: "vector", label: "向量" },
  { value: "keyword", label: "关键词" },
]

const EXECUTION_OPTIONS = [
  { value: "retrieval", label: "只测检索" },
  { value: "workflow", label: "固定流程基线" },
  { value: "agent", label: "Agent 策略评测" },
  { value: "auto", label: "线上自动策略评测" },
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
  const [name, setName] = useState("")
  const [executionMode, setExecutionMode] = useState<EvalExecutionMode>("retrieval")
  const [retrieverMode, setRetrieverMode] = useState("hybrid")
  const [topK, setTopK] = useState("6")
  const [assistantId, setAssistantId] = useState("")
  const [agentPolicyId, setAgentPolicyId] = useState("")
  const [includeFaithfulness, setIncludeFaithfulness] = useState(false)
  const [includeAnswerRelevancy, setIncludeAnswerRelevancy] = useState(false)
  const [includeCitationSupport, setIncludeCitationSupport] = useState(false)

  const assistants = useQuery({
    queryKey: ["assistants", "eval-run-create"],
    queryFn: listAssistants,
  })

  const policies = useQuery({
    queryKey: ["evals", "agent-policies"],
    queryFn: listAgentPolicies,
  })

  const assistantOptions = useMemo(
    () => [
      { value: "", label: "选择已发布助手" },
      ...(assistants.data ?? [])
        .filter((a) => Boolean(a.publishedAt))
        .map((a) => ({ value: a.id, label: a.name })),
    ],
    [assistants.data],
  )

  const policyOptions = useMemo(() => {
    const items = policies.data ?? []
    const preferred =
      executionMode === "workflow"
        ? items.filter((p) => p.id.startsWith("workflow-"))
        : items.filter((p) => p.id.startsWith("agent-") || p.status === "active")
    const source = preferred.length > 0 ? preferred : items
    return [
      { value: "", label: "默认（平台 active / 对应基线）" },
      ...source.map((p) => ({
        value: p.id,
        label: `${p.name} (${p.version}) · ${p.status}`,
      })),
    ]
  }, [policies.data, executionMode])

  const includeGeneration = executionMode !== "retrieval"
  const needsPolicy = executionMode === "workflow" || executionMode === "agent" || executionMode === "auto"
  const showFixedRetriever = executionMode === "retrieval" || executionMode === "workflow"
  const canSubmit =
    unlabeledCount === 0 &&
    Number(topK) >= 1 &&
    (!includeGeneration || Boolean(assistantId))

  function handleSubmit() {
    if (!canSubmit) return
    const parsedTopK = Math.max(1, Math.min(20, Number(topK) || 6))
    onSubmit({
      name: name.trim() || undefined,
      executionMode,
      retrieverMode,
      topK: parsedTopK,
      includeGeneration,
      assistantId: assistantId || undefined,
      agentPolicyId: needsPolicy && agentPolicyId ? agentPolicyId : undefined,
      includeFaithfulness: includeGeneration ? includeFaithfulness : false,
      includeAnswerRelevancy: includeGeneration ? includeAnswerRelevancy : false,
      includeCitationSupport: includeGeneration ? includeCitationSupport : false,
    })
  }

  return (
    <>
      <div className="grid gap-4">
        {unlabeledCount > 0 ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            仍有 {unlabeledCount} 个问题未标注相关 Chunk，请先完成标签再运行评测。
          </div>
        ) : null}

        <div>
          <label className="mb-1.5 block text-sm font-medium">运行名称（可选）</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：agent-policy-v2-vs-workflow"
            disabled={isSaving}
          />
        </div>

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
              Workflow 为固定基线；Agent / Auto 会真正跑 Agent Runtime 并冻结策略快照。
            </p>
          </div>
          {showFixedRetriever ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium">检索模式</label>
              <Select
                value={retrieverMode}
                onValueChange={setRetrieverMode}
                options={RETRIEVER_OPTIONS}
                disabled={isSaving}
              />
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-sm font-medium">候选策略</label>
              <Select
                value={agentPolicyId}
                onValueChange={setAgentPolicyId}
                options={policyOptions}
                disabled={isSaving || policies.isLoading}
                placeholder={policies.isLoading ? "加载策略…" : "选择策略版本"}
              />
            </div>
          )}
        </div>

        {needsPolicy && showFixedRetriever ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium">策略快照（可选）</label>
            <Select
              value={agentPolicyId}
              onValueChange={setAgentPolicyId}
              options={policyOptions}
              disabled={isSaving || policies.isLoading}
              placeholder={policies.isLoading ? "加载策略…" : "默认 Workflow baseline"}
            />
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Top K</label>
            <Input
              type="number"
              min={1}
              max={20}
              value={topK}
              onChange={(e) => setTopK(e.target.value)}
              disabled={isSaving || executionMode === "agent" || executionMode === "auto"}
            />
            {executionMode === "agent" || executionMode === "auto" ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Agent / Auto 使用策略内 defaultTopK，运行时仍可动态调整。
              </p>
            ) : null}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              问答助手{includeGeneration ? "" : "（可选）"}
            </label>
            <Select
              value={assistantId}
              onValueChange={setAssistantId}
              options={
                includeGeneration
                  ? assistantOptions
                  : [{ value: "", label: "不关联助手" }, ...assistantOptions]
              }
              disabled={isSaving || assistants.isLoading}
              placeholder={
                assistants.isLoading
                  ? "加载助手…"
                  : includeGeneration
                    ? "选择已发布助手"
                    : "可选：写入运行记录"
              }
            />
            {!includeGeneration ? (
              <p className="mt-1 text-xs text-muted-foreground">
                选择助手后，本次评测会出现在「Agent Runs」且来源为「评测与策略」。
              </p>
            ) : null}
          </div>
        </div>

        {includeGeneration ? (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="text-sm font-medium">模型评审（可选，费用更高）</div>
            <JudgeToggle
              label="Faithfulness"
              checked={includeFaithfulness}
              onChange={setIncludeFaithfulness}
              disabled={isSaving}
            />
            <JudgeToggle
              label="Answer Relevancy"
              checked={includeAnswerRelevancy}
              onChange={setIncludeAnswerRelevancy}
              disabled={isSaving}
            />
            <JudgeToggle
              label="Citation Support"
              checked={includeCitationSupport}
              onChange={setIncludeCitationSupport}
              disabled={isSaving}
            />
          </div>
        ) : null}
      </div>

      {hasError ? (
        <div className="mt-3 text-sm text-destructive">{errorText || "创建失败，请稍后重试"}</div>
      ) : null}

      <div className="mt-4 flex justify-end gap-3">
        <Button variant="dialog-cancel" size="dialog" onClick={onCancel} disabled={isSaving}>
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
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </label>
  )
}
