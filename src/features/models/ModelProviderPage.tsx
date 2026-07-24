import { useMemo, useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import type { ModelConfig, ModelConfigLinkedAssistant, ModelProvider } from "@/api/models"
import { getModelConfigLinkedAssistants } from "@/api/models"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { Dialog } from "@/components/ui/dialog"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useCreateModelConfig, useDeleteModelConfig, useModelConfigList, useUpdateModelConfig } from "@/features/models/queries"
import { useQueryClient } from "@tanstack/react-query"

type FormState = {
  provider: ModelProvider
  apiUrl: string
  apiKey: string
}

const PROVIDERS: Array<{ value: ModelProvider; label: string; defaultApiUrl: string }> = [
  { value: "aliyun-bailian", label: "百炼", defaultApiUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  { value: "deepseek", label: "DeepSeek", defaultApiUrl: "https://api.deepseek.com/v1" },
  { value: "openai", label: "OpenAI", defaultApiUrl: "https://api.openai.com/v1" },
]

function providerLabel(provider: ModelProvider) {
  return PROVIDERS.find((p) => p.value === provider)?.label ?? provider
}

function initialFormState(provider: ModelProvider = "aliyun-bailian"): FormState {
  const p = PROVIDERS.find((x) => x.value === provider) ?? PROVIDERS[0]
  return {
    provider: p.value,
    apiUrl: p.defaultApiUrl,
    apiKey: "",
  }
}

function getFormError(form: FormState): string | null {
  if (!form.apiUrl.trim()) return "API URL 不能为空"
  if (!form.apiKey.trim()) return "API KEY 不能为空"
  try {
    new URL(form.apiUrl.trim())
  } catch {
    return "API URL 格式不正确"
  }
  return null
}

export function ModelProviderPage() {
  const modelConfigs = useModelConfigList()
  const createModel = useCreateModelConfig()
  const updateModel = useUpdateModelConfig()
  const deleteModel = useDeleteModelConfig()
  const qc = useQueryClient()

  const [editing, setEditing] = useState<ModelConfig | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(initialFormState)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ModelConfig | null>(null)
  const [deletingLinked, setDeletingLinked] = useState<ModelConfigLinkedAssistant[]>([])
  const [checkingDeleteLinked, setCheckingDeleteLinked] = useState(false)

  const [query, setQuery] = useState("")

  const submitting = createModel.isPending || updateModel.isPending
  const list = useMemo(() => modelConfigs.data ?? [], [modelConfigs.data])
  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((x) => providerLabel(x.provider).toLowerCase().includes(q))
  }, [list, query])
  const countLabel = useMemo(() => {
    const total = list.length
    const filtered = filteredList.length
    if (query.trim()) return `${filtered}/${total} 个供应商配置`
    return `${total} 个供应商配置`
  }, [list.length, filteredList.length, query])
  const loadErrorText = modelConfigs.error instanceof Error ? modelConfigs.error.message : ""

  const usedProviders = useMemo(() => new Set(list.map((x) => x.provider)), [list])
  const availableProviders = useMemo(() => PROVIDERS.filter((p) => !usedProviders.has(p.value)), [usedProviders])
  const canCreate = availableProviders.length > 0

  const columns = useMemo<Array<DataTableColumn<ModelConfig>>>(
    () => [
      {
        key: "provider",
        header: "名称",
        className: "w-[18%]",
        render: (item) => providerLabel(item.provider),
      },
      {
        key: "apiUrl",
        header: "API URL",
        className: "w-[42%]",
        cellClassName: "truncate",
        render: (item) => <span title={item.apiUrl}>{item.apiUrl}</span>,
      },
      {
        key: "apiKey",
        header: "API KEY",
        className: "w-[22%]",
        render: (item) => item.apiKeyMasked,
      },
      {
        key: "actions",
        header: "操作",
        className: "w-[10%] text-center",
        cellClassName: "text-center",
        render: (item) => (
          <div className="inline-flex items-center justify-center gap-0.5 whitespace-nowrap">
            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(item)} title="编辑" aria-label="编辑">
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleDelete(item)}
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
    [checkingDeleteLinked, deleteModel.isPending],
  )

  function openCreate() {
    setEditing(null)
    setForm(initialFormState(availableProviders[0]?.value ?? "aliyun-bailian"))
    setError(null)
    setOpen(true)
  }

  function openEdit(item: ModelConfig) {
    setEditing(item)
    setForm({
      provider: item.provider,
      apiUrl: item.apiUrl,
      apiKey: "",
    })
    setError(null)
    setOpen(true)
  }

  function closeDialog() {
    if (submitting) return
    setOpen(false)
    setError(null)
  }

  async function submit() {
    const validationError = getFormError(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    const payload = {
      provider: form.provider,
      apiUrl: form.apiUrl.trim(),
      apiKey: form.apiKey.trim(),
    }

    try {
      if (!editing) {
        await createModel.mutateAsync(payload)
      } else {
        await updateModel.mutateAsync({ id: editing.id, body: payload })
      }
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败，请稍后重试")
    }
  }

  async function handleDelete(config: ModelConfig) {
    setCheckingDeleteLinked(true)
    try {
      const linked = await getModelConfigLinkedAssistants(config.id)
      if (linked.length) {
        setDeleting(config)
        setDeletingLinked(linked)
      } else {
        setDeleting(config)
        setDeletingLinked([])
      }
    } catch {
      setDeleting(config)
      setDeletingLinked([])
    } finally {
      setCheckingDeleteLinked(false)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    await deleteModel.mutateAsync({ id: deleting.id })
    setDeleting(null)
    setDeletingLinked([])
    await qc.invalidateQueries({ queryKey: ["assistants"] })
  }

  return (
    <div className="space-y-2">
      <div>
        <Breadcrumb items={[{ label: "模型供应商" }]} />
        <p className="mt-1 text-sm text-muted-foreground">管理模型供应商配置(每种供应商仅允许一个配置)</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">{countLabel}</div>
        <div className="flex items-center gap-1.5">
          <Input
            clearable
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索供应商名称"
          />
          <span className="group relative inline-flex">
            <Button size="lg" onClick={openCreate} disabled={!canCreate}>
              添加供应商配置
            </Button>
            {!canCreate ? (
              <span className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100">
                所有供应商都已配置
              </span>
            ) : null}
          </span>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredList}
        getRowKey={(item) => item.id}
        loading={modelConfigs.isLoading}
        error={modelConfigs.isError}
        errorText={
          <>
            加载失败，请检查后端服务
            {loadErrorText ? <div className="mt-2 text-xs text-muted-foreground">{loadErrorText}</div> : null}
          </>
        }
      />

      <Dialog open={open} onOpenChange={(next) => !next && closeDialog()} title={editing ? "编辑供应商配置" : "添加供应商配置"}>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium">
              供应商 <span className="text-destructive">*</span>
            </label>
            <Select
              className="mt-2"
              value={form.provider}
              onValueChange={(v) => {
                const next = v as ModelProvider
                const defaultApiUrl = PROVIDERS.find((p) => p.value === next)?.defaultApiUrl ?? ""
                setForm((prev) => ({ ...prev, provider: next, apiUrl: editing ? prev.apiUrl : defaultApiUrl }))
              }}
              options={
                editing
                  ? PROVIDERS.map((p) => ({ label: p.label, value: p.value }))
                  : PROVIDERS.map((p) => ({
                      label: usedProviders.has(p.value) ? `${p.label}（已配置）` : p.label,
                      value: p.value,
                      disabled: usedProviders.has(p.value),
                    }))
              }
              modal={false}
              disabled={!!editing}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              API URL <span className="text-destructive">*</span>
            </label>
            <input
              className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
              value={form.apiUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, apiUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              API KEY <span className="text-destructive">*</span>
            </label>
            <input
              type="password"
              className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
              value={form.apiKey}
              onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
              placeholder={editing ? "编辑时请重新输入 API KEY" : "请输入 API KEY"}
            />
          </div>

          {error ? <div className="text-sm text-destructive">{error}</div> : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="lg" onClick={closeDialog} disabled={submitting}>
              取消
            </Button>
            <Button size="lg" onClick={submit} loading={submitting} loadingText="保存中">
              保存
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleting && deletingLinked.length > 0}
        onCancel={() => {
          setDeleting(null)
          setDeletingLinked([])
        }}
        onConfirm={confirmDelete}
        title="确认删除供应商配置"
        errorText={deleteModel.isError ? "删除失败，请重试" : null}
        confirming={deleteModel.isPending}
      >
        {deleting && deletingLinked.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              以下问答助手正在使用「{providerLabel(deleting.provider)}」配置，删除后将<b>取消发布</b>这些助手：
            </p>
            <ul className="max-h-36 overflow-auto rounded-md border bg-muted/30 p-2 text-sm">
              {deletingLinked.map((a) => (
                <li key={a.id} className="flex items-center gap-2 rounded-sm px-2 py-1.5">
                  <span className="truncate">{a.name}</span>
                  {a.published ? (
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700">已发布</span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs text-zinc-700">未发布</span>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">确定要继续删除吗？</p>
          </div>
        ) : null}
      </ConfirmDeleteDialog>

      <ConfirmDeleteDialog
        open={!!deleting && deletingLinked.length === 0}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        description={deleting ? `将删除${providerLabel(deleting.provider)}供应商配置，此操作不可恢复` : undefined}
        errorText={deleteModel.isError ? "删除失败，请重试" : null}
        confirming={deleteModel.isPending}
      />
    </div>
  )
}
