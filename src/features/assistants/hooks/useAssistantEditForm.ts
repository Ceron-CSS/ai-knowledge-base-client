import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import type { Assistant } from "@/api/assistants"
import { DEFAULT_BASE_MODEL, getBaseModelOptionsForProvider } from "@/features/assistants/constants/baseModelOptions"
import {
  useCreateAssistant,
  useCreateAndPublishAssistant,
  usePublishAssistant,
  useUnpublishAssistant,
  useUpdateAssistant,
} from "@/features/assistants/hooks/queries"
import { validateAssistantForm } from "@/features/assistants/lib/validateAssistantForm"
import { useKbPicker } from "@/features/kb"
import { useModelConfigList } from "@/features/modelProviders"

type UseAssistantEditFormOptions = {
  existing?: Assistant
}

export function useAssistantEditForm({ existing }: UseAssistantEditFormOptions) {
  const navigate = useNavigate()
  const { id: routeId } = useParams()
  const resolvedAssistantId =
    existing?.id ?? (routeId && routeId !== "new" ? routeId : undefined)

  const modelConfigs = useModelConfigList()
  const createAssistant = useCreateAssistant()
  const createAndPublishAssistant = useCreateAndPublishAssistant()
  const updateAssistant = useUpdateAssistant()
  const publishAssistant = usePublishAssistant()
  const unpublishAssistant = useUnpublishAssistant()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [modelConfigId, setModelConfigId] = useState("")
  const [baseModel, setBaseModel] = useState(DEFAULT_BASE_MODEL)
  const [systemPrompt, setSystemPrompt] = useState("")
  const [kbIds, setKbIds] = useState<string[]>([])
  const [executionMode, setExecutionMode] = useState<"workflow" | "agent">("workflow")
  const [error, setError] = useState<string | null>(null)

  const kbPicker = useKbPicker()

  const configMap = useMemo(() => new Map((modelConfigs.data ?? []).map((x) => [x.id, x])), [modelConfigs.data])
  const configOptions = useMemo(
    () =>
      (modelConfigs.data ?? []).map((x) => ({
        label: x.provider === "deepseek" ? "DeepSeek" : x.provider === "openai" ? "OpenAI" : "百炼",
        value: x.id,
      })),
    [modelConfigs.data],
  )
  const resolvedModelConfigId = modelConfigId || configOptions[0]?.value || ""
  const selectedProvider = resolvedModelConfigId
    ? (configMap.get(resolvedModelConfigId)?.provider ?? "aliyun-bailian")
    : "aliyun-bailian"
  const baseModelOptions = getBaseModelOptionsForProvider(selectedProvider)
  const resolvedBaseModel = baseModelOptions.some((x) => x.value === baseModel)
    ? baseModel
    : (baseModelOptions[0]?.value ?? "")

  // Hydrate when assistant data first arrives or the edited id changes.
  // Keep synced id starting as undefined so React Query cache hits still fill
  // the form (initializing from existing?.id would skip that case).
  const [syncedExistingId, setSyncedExistingId] = useState<string | undefined>(undefined)
  if (existing && existing.id !== syncedExistingId) {
    setSyncedExistingId(existing.id)
    setName(existing.name)
    setDescription(existing.description ?? "")
    setModelConfigId(existing.modelConfigId ?? "")
    setBaseModel(existing.baseModel ?? DEFAULT_BASE_MODEL)
    setSystemPrompt(existing.systemPrompt ?? "")
    setKbIds(existing.kbIds ?? [])
    setExecutionMode(existing.executionMode ?? "workflow")
    setError(null)
  }
  const disabledKbNames = useMemo(() => {
    return kbPicker.items
      .filter((kb) => !kb.enabled && kbIds.includes(kb.id))
      .map((kb) => kb.name)
  }, [kbPicker.items, kbIds])

  const isPublished = !!existing?.publishedAt
  const submitting =
    createAssistant.isPending ||
    createAndPublishAssistant.isPending ||
    updateAssistant.isPending ||
    publishAssistant.isPending ||
    unpublishAssistant.isPending

  const selectedConfig = resolvedModelConfigId ? configMap.get(resolvedModelConfigId) : undefined
  const agentSupported = !!selectedConfig?.toolCallingEnabled
  const agentDisabledReason = !selectedConfig
    ? "请先选择模型配置"
    : !selectedConfig.toolCallingEnabled
      ? "当前模型提供商不支持 Tool Calling / Agent 模式"
      : null

  function buildPayload() {
    const trimmedName = name.trim()
    return {
      name: trimmedName,
      description: description.trim() ? description.trim() : undefined,
      modelConfigId: resolvedModelConfigId,
      baseModel: resolvedBaseModel,
      systemPrompt: systemPrompt.trim() ? systemPrompt.trim() : undefined,
      kbIds,
      executionMode,
    }
  }

  function buildUpdatePayload() {
    const trimmedName = name.trim()
    return {
      name: trimmedName,
      description: description.trim() ? description.trim() : null,
      modelConfigId: resolvedModelConfigId,
      baseModel: resolvedBaseModel,
      systemPrompt: systemPrompt.trim() ? systemPrompt.trim() : null,
      kbIds,
      executionMode,
    }
  }

  async function save() {
    const validationError = validateAssistantForm({ name, modelConfigId: resolvedModelConfigId, baseModel: resolvedBaseModel })
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    try {
      if (!resolvedAssistantId) {
        const created = await createAssistant.mutateAsync(buildPayload())
        navigate(`/assistants/${created.id}`, { replace: true })
        return
      }

      await updateAssistant.mutateAsync({
        id: resolvedAssistantId,
        body: buildUpdatePayload(),
      })
      navigate("/assistants", { replace: true })
    } catch {
      setError("保存失败，请重试")
    }
  }

  async function handlePublish() {
    const validationError = validateAssistantForm({ name, modelConfigId: resolvedModelConfigId, baseModel: resolvedBaseModel })
    if (validationError) {
      setError(validationError)
      return
    }

    if (disabledKbNames.length) {
      setError(`无法发布：以下关联知识库已停用：${disabledKbNames.join("、")}`)
      return
    }

    setError(null)
    try {
      if (!resolvedAssistantId) {
        await createAndPublishAssistant.mutateAsync(buildPayload())
        navigate("/assistants", { replace: true })
        return
      }

      await updateAssistant.mutateAsync({
        id: resolvedAssistantId,
        body: buildUpdatePayload(),
      })
      await publishAssistant.mutateAsync({ id: resolvedAssistantId })
      navigate("/assistants", { replace: true })
    } catch {
      setError("发布失败，请重试")
    }
  }

  async function handleUnpublish() {
    if (!resolvedAssistantId) return
    setError(null)
    try {
      await unpublishAssistant.mutateAsync({ id: resolvedAssistantId })
      navigate("/assistants", { replace: true })
    } catch {
      setError("取消发布失败，请重试")
    }
  }

  return {
    name,
    setName,
    description,
    setDescription,
    modelConfigId: resolvedModelConfigId,
    setModelConfigId,
    baseModel: resolvedBaseModel,
    setBaseModel,
    systemPrompt,
    setSystemPrompt,
    kbIds,
    setKbIds,
    executionMode,
    setExecutionMode,
    agentSupported,
    agentDisabledReason,
    error,
    configOptions,
    baseModelOptions,
    kbPicker,
    modelConfigs,
    isPublished,
    submitting,
    savePending: createAssistant.isPending || updateAssistant.isPending,
    unpublishPending: unpublishAssistant.isPending,
    save,
    handlePublish,
    handleUnpublish,
  }
}
