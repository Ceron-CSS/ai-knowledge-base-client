import { useCallback, useMemo, useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import type { ModelConfig, ModelConfigLinkedAssistant } from "@/api/models"
import { getModelConfigLinkedAssistants } from "@/api/models"
import { Button } from "@/components/ui/button"
import type { DataTableColumn } from "@/components/ui/data-table"
import { MODEL_PROVIDERS } from "@/features/modelProviders/constants/providers"
import {
  useCreateModelConfig,
  useDeleteModelConfig,
  useModelConfigList,
  useUpdateModelConfig,
} from "@/features/modelProviders/hooks/queries"
import { filterModelProviderList } from "@/features/modelProviders/lib/filterModelProviderList"
import { getModelProviderFormError, initialModelProviderFormState } from "@/features/modelProviders/lib/modelProviderForm"
import { providerLabel } from "@/features/modelProviders/lib/providerLabel"
import type { ModelProviderFormState } from "@/features/modelProviders/types"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/app/queryKeys"

export function useModelProviderPage() {
  const modelConfigs = useModelConfigList()
  const createModel = useCreateModelConfig()
  const updateModel = useUpdateModelConfig()
  const deleteModel = useDeleteModelConfig()
  const qc = useQueryClient()

  const [editing, setEditing] = useState<ModelConfig | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<ModelProviderFormState>(initialModelProviderFormState())
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ModelConfig | null>(null)
  const [deletingLinked, setDeletingLinked] = useState<ModelConfigLinkedAssistant[]>([])
  const [checkingDeleteLinked, setCheckingDeleteLinked] = useState(false)
  const [linkedCheckError, setLinkedCheckError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitting = isSubmitting || createModel.isPending || updateModel.isPending
  const list = useMemo(() => modelConfigs.data ?? [], [modelConfigs.data])
  const filteredList = useMemo(() => filterModelProviderList(list, query), [list, query])
  const countLabel = useMemo(() => {
    const total = list.length
    const filtered = filteredList.length
    if (query.trim()) return `${filtered}/${total} 个模型提供商`
    return `${total} 个模型提供商`
  }, [list.length, filteredList.length, query])
  const loadErrorText = modelConfigs.error instanceof Error ? modelConfigs.error.message : ""

  const usedProviders = useMemo(() => new Set(list.map((item) => item.provider)), [list])
  const availableProviders = useMemo(
    () => MODEL_PROVIDERS.filter((provider) => !usedProviders.has(provider.value)),
    [usedProviders],
  )
  const canCreate = availableProviders.length > 0

  const openEdit = useCallback((item: ModelConfig) => {
    setEditing(item)
    setForm({
      provider: item.provider,
      apiUrl: item.apiUrl,
      apiKey: "",
    })
    setError(null)
    setOpen(true)
  }, [])

  const handleDelete = useCallback(async (config: ModelConfig) => {
    setCheckingDeleteLinked(true)
    setLinkedCheckError(null)
    try {
      const linked = await getModelConfigLinkedAssistants(config.id)
      setDeleting(config)
      setDeletingLinked(linked)
    } catch {
      setLinkedCheckError("无法检查关联助手，请稍后重试")
    } finally {
      setCheckingDeleteLinked(false)
    }
  }, [])

  const columns = useMemo<Array<DataTableColumn<ModelConfig>>>(
    () => [
      {
        key: "provider",
        header: "名称",
        className: "w-[18%]",
        render: (item) => (
          <Button
            variant="ghost"
            className="h-auto px-0 font-normal text-foreground hover:bg-transparent hover:text-primary"
            onClick={() => openEdit(item)}
            title={`编辑 ${providerLabel(item.provider)}`}
          >
            {providerLabel(item.provider)}
          </Button>
        ),
      },
      {
        key: "apiUrl",
        header: "API URL",
        className: "w-[50%]",
        cellClassName: "truncate",
        render: (item) => <span title={item.apiUrl}>{item.apiUrl}</span>,
      },
      {
        key: "apiKey",
        header: "API KEY",
        className: "w-[20%]",
        render: (item) => item.apiKeyMasked,
      },
      {
        key: "actions",
        header: "操作",
        className: "w-[12%] text-center",
        cellClassName: "text-center",
        render: (item) => (
          <div className="inline-flex items-center justify-center gap-0.5 whitespace-nowrap">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-foreground/80 hover:bg-primary/10 hover:text-primary"
              onClick={() => openEdit(item)}
              title="编辑"
              aria-label="编辑"
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-foreground/80 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => void handleDelete(item)}
              disabled={deleteModel.isPending || checkingDeleteLinked}
              title="删除"
              aria-label="删除"
            >
              <Trash2 />
            </Button>
          </div>
        ),
      },
    ],
    [checkingDeleteLinked, deleteModel.isPending, handleDelete, openEdit],
  )

  function openCreate() {
    setEditing(null)
    setForm(initialModelProviderFormState(availableProviders[0]?.value ?? "aliyun-bailian"))
    setError(null)
    setOpen(true)
  }

  const closeDialog = useCallback(() => {
    if (submitting) return
    setOpen(false)
    setError(null)
  }, [submitting])

  async function submit() {
    if (submitting) return

    const validationError = getModelProviderFormError(form, { isEditing: !!editing })
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError(null)
    const trimmedApiUrl = form.apiUrl.trim()
    const trimmedApiKey = form.apiKey.trim()

    try {
      if (!editing) {
        await createModel.mutateAsync({
          provider: form.provider,
          apiUrl: trimmedApiUrl,
          apiKey: trimmedApiKey,
        })
      } else {
        const payload: Parameters<typeof updateModel.mutateAsync>[0]["body"] = {}
        if (trimmedApiUrl !== editing.apiUrl) payload.apiUrl = trimmedApiUrl
        if (trimmedApiKey) payload.apiKey = trimmedApiKey

        if (Object.keys(payload).length === 0) {
          closeDialog()
          return
        }

        await updateModel.mutateAsync({ id: editing.id, body: payload })
      }
      closeDialog()
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败，请稍后重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  function cancelDelete() {
    setDeleting(null)
    setDeletingLinked([])
  }

  async function confirmDelete() {
    if (!deleting) return
    const id = deleting.id
    const acknowledgeLinked = deletingLinked.length > 0
    cancelDelete()
    try {
      await deleteModel.mutateAsync({
        id,
        acknowledgeLinked,
      })
      await qc.invalidateQueries({ queryKey: queryKeys.assistants.root })
    } catch {
      // Error toast is handled by the delete mutation.
    }
  }

  return {
    query,
    setQuery,
    countLabel,
    canCreate,
    columns,
    filteredList,
    modelConfigs,
    loadErrorText,
    open,
    editing,
    form,
    setForm,
    usedProviders,
    error,
    submitting,
    deleting,
    deletingLinked,
    linkedCheckError,
    deleteModel,
    openCreate,
    closeDialog,
    submit: () => void submit(),
    cancelDelete,
    confirmDelete: () => void confirmDelete(),
  }
}
