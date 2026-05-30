import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import type { Assistant } from "@/api/assistants"
import { MultiSelect } from "@/components/ui/multi-select"
import { Select } from "@/components/ui/select"
import { useAssistant, useCreateAssistant, usePublishAssistant, useUnpublishAssistant, useUpdateAssistant } from "@/features/assistants/queries"
import { useKbList } from "@/features/kb/queries"
import { useModelConfigList } from "@/features/models/queries"

const BASE_MODEL_OPTIONS_BY_PROVIDER: Record<string, Array<{ label: string; value: string }>> = {
  "aliyun-bailian": [
    { label: "qwen-plus", value: "qwen-plus" },
    { label: "qwen-turbo", value: "qwen-turbo" },
    { label: "qwen-max", value: "qwen-max" },
    { label: "qwen-long", value: "qwen-long" },
    { label: "qwen-flash", value: "qwen-flash" },
    { label: "qwen-plus-latest", value: "qwen-plus-latest" },
    { label: "qwen-turbo-latest", value: "qwen-turbo-latest" },
    { label: "qwen-max-latest", value: "qwen-max-latest" },
    { label: "qwen3-plus", value: "qwen3-plus" },
    { label: "qwen3-max", value: "qwen3-max" },
    { label: "qwen3-coder-plus", value: "qwen3-coder-plus" },
    { label: "qwen3-coder-flash", value: "qwen3-coder-flash" },
  ],
  deepseek: [
    { label: "deepseek-v4-pro", value: "deepseek-v4-pro" },
    { label: "deepseek-v4-flash", value: "deepseek-v4-flash" },
  ],
}

export function AssistantEditPage() {
  const navigate = useNavigate()
  const params = useParams()
  const id = params.id

  const isNew = id === "new" || !id
  const existingQuery = useAssistant(id ?? "", !isNew && !!id)
  const existing = existingQuery.data as Assistant | undefined

  const kbList = useKbList()
  const modelConfigs = useModelConfigList()
  const createAssistant = useCreateAssistant()
  const updateAssistant = useUpdateAssistant()
  const publishAssistant = usePublishAssistant()
  const unpublishAssistant = useUnpublishAssistant()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [modelConfigId, setModelConfigId] = useState("")
  const [baseModel, setBaseModel] = useState(BASE_MODEL_OPTIONS_BY_PROVIDER["aliyun-bailian"][0].value)
  const [systemPrompt, setSystemPrompt] = useState("")
  const [kbIds, setKbIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const configMap = useMemo(() => new Map((modelConfigs.data ?? []).map((x) => [x.id, x])), [modelConfigs.data])
  const configOptions = useMemo(
    () =>
      (modelConfigs.data ?? []).map((x) => ({
        label: x.provider === "deepseek" ? "DeepSeek" : "百炼",
        value: x.id,
      })),
    [modelConfigs.data],
  )
  const selectedProvider = modelConfigId ? configMap.get(modelConfigId)?.provider ?? "aliyun-bailian" : "aliyun-bailian"
  const baseModelOptions = BASE_MODEL_OPTIONS_BY_PROVIDER[selectedProvider] ?? BASE_MODEL_OPTIONS_BY_PROVIDER["aliyun-bailian"]

  useEffect(() => {
    if (!existing) return
    setName(existing.name)
    setDescription(existing.description ?? "")
    setModelConfigId(existing.modelConfigId ?? "")
    setBaseModel(existing.baseModel ?? BASE_MODEL_OPTIONS_BY_PROVIDER["aliyun-bailian"][0].value)
    setSystemPrompt(existing.systemPrompt ?? "")
    setKbIds(existing.kbIds ?? [])
  }, [existing])

  useEffect(() => {
    if (modelConfigId) return
    if (!configOptions.length) return
    setModelConfigId(configOptions[0].value)
  }, [modelConfigId, configOptions])

  useEffect(() => {
    if (!baseModelOptions.some((x) => x.value === baseModel)) {
      setBaseModel(baseModelOptions[0]?.value ?? "")
    }
  }, [baseModel, baseModelOptions])

  const title = isNew ? "创建问答助手" : "配置问答助手"

  const disabledKbNames = useMemo(() => {
    if (!kbList.data) return []
    return kbList.data
      .filter((kb) => !kb.enabled && kbIds.includes(kb.id))
      .map((kb) => kb.name)
  }, [kbList.data, kbIds])

  function validateForm(): string | null {
    if (!name.trim()) return "请输入助手名称"
    if (!modelConfigId) return "请选择模型配置"
    if (!baseModel) return "请选择基础模型"
    return null
  }

  async function save() {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    const trimmedName = name.trim()
    setError(null)
    try {
      if (isNew) {
        const created = await createAssistant.mutateAsync({
          name: trimmedName,
          description: description.trim() ? description.trim() : undefined,
          modelConfigId,
          baseModel,
          systemPrompt: systemPrompt.trim() ? systemPrompt.trim() : undefined,
          kbIds,
        })
        navigate(`/assistants/${created.id}`, { replace: true })
        return
      }

      if (!existing) {
        setError("未找到该助手，可能已被删除。")
        return
      }

      await updateAssistant.mutateAsync({
        id: existing.id,
        body: {
          name: trimmedName,
          description: description.trim() ? description.trim() : null,
          modelConfigId,
          baseModel,
          systemPrompt: systemPrompt.trim() ? systemPrompt.trim() : null,
          kbIds,
        },
      })
      navigate("/assistants", { replace: true })
    } catch {
      setError("保存失败，请重试。")
    }
  }

  async function handlePublish() {
    // Save first, then publish
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    // Check disabled KBs
    if (disabledKbNames.length) {
      setError(`无法发布：以下关联知识库已停用：${disabledKbNames.join("、")}`)
      return
    }

    const trimmedName = name.trim()
    setError(null)
    try {
      let assistantId = existing?.id ?? ""

      if (isNew) {
        const created = await createAssistant.mutateAsync({
          name: trimmedName,
          description: description.trim() ? description.trim() : undefined,
          modelConfigId,
          baseModel,
          systemPrompt: systemPrompt.trim() ? systemPrompt.trim() : undefined,
          kbIds,
        })
        assistantId = created.id
      } else {
        await updateAssistant.mutateAsync({
          id: existing!.id,
          body: {
            name: trimmedName,
            description: description.trim() ? description.trim() : null,
            modelConfigId,
            baseModel,
            systemPrompt: systemPrompt.trim() ? systemPrompt.trim() : null,
            kbIds,
          },
        })
      }

      await publishAssistant.mutateAsync({ id: assistantId })
      navigate("/assistants", { replace: true })
    } catch {
      setError("发布失败，请重试。")
    }
  }

  async function handleUnpublish() {
    if (!existing) return
    setError(null)
    try {
      await unpublishAssistant.mutateAsync({ id: existing.id })
      navigate("/assistants", { replace: true })
    } catch {
      setError("取消发布失败，请重试。")
    }
  }

  const isPublished = !!existing?.publishedAt
  const submitting = createAssistant.isPending || updateAssistant.isPending || publishAssistant.isPending || unpublishAssistant.isPending

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <button className="rounded-md border px-2 py-1.5 text-sm hover:bg-muted/60" onClick={() => navigate("/assistants")}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">填写配置后点击保存或发布（发布后可在对话页面使用）。</p>
        </div>
      </div>

      <div className="rounded-lg border bg-background p-4">
        <div className="grid gap-6">
          {!isNew && existingQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">加载中...</div>
          ) : !isNew && existingQuery.isError ? (
            <div className="text-sm text-destructive">加载失败：请检查后端服务。</div>
          ) : null}

          <div>
            <div className="text-sm font-medium">基本信息</div>
            <div className="mt-3 grid gap-4">
              <div>
                <label className="block text-sm font-medium">
                  助手名称 <span className="text-destructive">*</span>
                </label>
                <input
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：售后问答助手"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">描述</label>
                <textarea
                  className="mt-2 min-h-24 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="可选：简述该助手的用途与边界"
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium">模型配置</div>
            <div className="mt-3 grid gap-4">
              <div>
                <label className="block text-sm font-medium">
                  模型配置 <span className="text-destructive">*</span>
                </label>
                <Select
                  className="mt-2"
                  value={modelConfigId}
                  onValueChange={setModelConfigId}
                  options={configOptions}
                  placeholder={modelConfigs.isLoading ? "加载模型配置中..." : "请选择模型配置"}
                  disabled={!configOptions.length || modelConfigs.isLoading}
                />
                {!configOptions.length && !modelConfigs.isLoading ? (
                  <div className="mt-2 text-xs text-muted-foreground">暂无可用模型配置，请先去“模型”页面添加供应商配置。</div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium">
                  基础模型 <span className="text-destructive">*</span>
                </label>
                <Select className="mt-2" value={baseModel} onValueChange={setBaseModel} options={baseModelOptions} />
              </div>

              <div>
                <label className="block text-sm font-medium">提示词（System Prompt）</label>
                <textarea
                  className="mt-2 min-h-40 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="例如：你是一个严格遵循公司知识库回答的助手..."
                  rows={8}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium">知识库关联</div>
            <div className="mt-3">
              {kbList.isLoading ? (
                <div className="text-sm text-muted-foreground">加载知识库列表中...</div>
              ) : kbList.isError ? (
                <div className="text-sm text-destructive">加载失败：请确认后端服务可用。</div>
              ) : kbList.data?.length ? (
                <MultiSelect
                  value={kbIds}
                  onValueChange={setKbIds}
                  options={kbList.data
                    .map((kb) => ({
                      label: kb.enabled ? kb.name : `${kb.name}（已停用）`,
                      value: kb.id,
                      disabled: !kb.enabled,
                    }))}
                  placeholder="选择关联的知识库"
                  searchPlaceholder="搜索知识库..."
                  emptyText="无匹配的知识库"
                />
              ) : (
                <div className="text-sm text-muted-foreground">暂无可关联的知识库，先去"知识库"创建。</div>
              )}
            </div>
          </div>

          {error ? <div className="text-sm text-destructive">{error}</div> : null}

          <div className="flex items-center justify-between gap-2">
            <div>
              {!isNew && isPublished ? (
                <button
                  className="rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  onClick={handleUnpublish}
                  disabled={submitting}
                >
                  取消发布
                </button>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button className="rounded-md border px-3 py-2 text-sm hover:bg-muted/60" onClick={() => navigate("/assistants")} disabled={submitting}>
                取消
              </button>
              <button
                className="rounded-md border px-3 py-2 text-sm hover:bg-muted/60 disabled:opacity-50"
                onClick={save}
                disabled={!name.trim() || !modelConfigId || !baseModel || submitting}
              >
                保存
              </button>
              <button
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                onClick={handlePublish}
                disabled={!name.trim() || !modelConfigId || !baseModel || submitting}
              >
                {isPublished ? "重新发布" : "发布"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
