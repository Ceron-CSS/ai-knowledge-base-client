import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import type { Assistant } from "@/api/assistants"
import { DEFAULT_BASE_MODEL, getBaseModelOptionsForProvider } from "@/features/assistants/constants/baseModelOptions"
import {
  useCreateAssistant,
  usePublishAssistant,
  useUnpublishAssistant,
  useUpdateAssistant,
} from "@/features/assistants/hooks/queries"
import { validateAssistantForm } from "@/features/assistants/lib/validateAssistantForm"
import { useKbList } from "@/features/kb"
import { useModelConfigList } from "@/features/modelProviders"

type UseAssistantEditFormOptions = {
  isNew: boolean
  existing?: Assistant
}

export function useAssistantEditForm({ isNew, existing }: UseAssistantEditFormOptions) {
  const navigate = useNavigate()

  const kbList = useKbList()
  const modelConfigs = useModelConfigList()
  const createAssistant = useCreateAssistant()
  const updateAssistant = useUpdateAssistant()
  const publishAssistant = usePublishAssistant()
  const unpublishAssistant = useUnpublishAssistant()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [modelConfigId, setModelConfigId] = useState("")
  const [baseModel, setBaseModel] = useState(DEFAULT_BASE_MODEL)
  const [systemPrompt, setSystemPrompt] = useState("")
  const [kbIds, setKbIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const configMap = useMemo(() => new Map((modelConfigs.data ?? []).map((x) => [x.id, x])), [modelConfigs.data])
  const configOptions = useMemo(
    () =>
      (modelConfigs.data ?? []).map((x) => ({
        label: x.provider === "deepseek" ? "DeepSeek" : x.provider === "openai" ? "OpenAI" : "百炼",
        value: x.id,
      })),
    [modelConfigs.data],
  )
  const selectedProvider = modelConfigId ? (configMap.get(modelConfigId)?.provider ?? "aliyun-bailian") : "aliyun-bailian"
  const baseModelOptions = getBaseModelOptionsForProvider(selectedProvider)

  useEffect(() => {
    if (!existing) return
    setName(existing.name)
    setDescription(existing.description ?? "")
    setModelConfigId(existing.modelConfigId ?? "")
    setBaseModel(existing.baseModel ?? DEFAULT_BASE_MODEL)
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

  const disabledKbNames = useMemo(() => {
    if (!kbList.data) return []
    return kbList.data.filter((kb) => !kb.enabled && kbIds.includes(kb.id)).map((kb) => kb.name)
  }, [kbList.data, kbIds])

  const isPublished = !!existing?.publishedAt
  const submitting =
    createAssistant.isPending || updateAssistant.isPending || publishAssistant.isPending || unpublishAssistant.isPending

  function buildPayload() {
    const trimmedName = name.trim()
    return {
      name: trimmedName,
      description: description.trim() ? description.trim() : undefined,
      modelConfigId,
      baseModel,
      systemPrompt: systemPrompt.trim() ? systemPrompt.trim() : undefined,
      kbIds,
    }
  }

  function buildUpdatePayload() {
    const trimmedName = name.trim()
    return {
      name: trimmedName,
      description: description.trim() ? description.trim() : null,
      modelConfigId,
      baseModel,
      systemPrompt: systemPrompt.trim() ? systemPrompt.trim() : null,
      kbIds,
    }
  }

  async function save() {
    const validationError = validateAssistantForm({ name, modelConfigId, baseModel })
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    try {
      if (isNew) {
        const created = await createAssistant.mutateAsync(buildPayload())
        navigate(`/assistants/${created.id}`, { replace: true })
        return
      }

      if (!existing) {
        setError("未找到该助手，可能已被删除")
        return
      }

      await updateAssistant.mutateAsync({
        id: existing.id,
        body: buildUpdatePayload(),
      })
      navigate("/assistants", { replace: true })
    } catch {
      setError("保存失败，请重试")
    }
  }

  async function handlePublish() {
    const validationError = validateAssistantForm({ name, modelConfigId, baseModel })
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
      let assistantId = existing?.id ?? ""

      if (isNew) {
        const created = await createAssistant.mutateAsync(buildPayload())
        assistantId = created.id
      } else {
        await updateAssistant.mutateAsync({
          id: existing!.id,
          body: buildUpdatePayload(),
        })
      }

      await publishAssistant.mutateAsync({ id: assistantId })
      navigate("/assistants", { replace: true })
    } catch {
      setError("发布失败，请重试")
    }
  }

  async function handleUnpublish() {
    if (!existing) return
    setError(null)
    try {
      await unpublishAssistant.mutateAsync({ id: existing.id })
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
    modelConfigId,
    setModelConfigId,
    baseModel,
    setBaseModel,
    systemPrompt,
    setSystemPrompt,
    kbIds,
    setKbIds,
    error,
    configOptions,
    baseModelOptions,
    kbList,
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
