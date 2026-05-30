import { useMemo, useState } from "react"
import type { ModelConfig, ModelProvider } from "@/api/models"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { Dialog } from "@/components/ui/dialog"
import { Select } from "@/components/ui/select"
import { useCreateModelConfig, useDeleteModelConfig, useModelConfigList, useUpdateModelConfig } from "@/features/search/queries"

type FormState = {
  name: string
  provider: ModelProvider
  apiUrl: string
  apiKey: string
}

function initialFormState(): FormState {
  return {
    name: "",
    provider: "aliyun-bailian",
    apiUrl: "",
    apiKey: "",
  }
}

function getFormError(form: FormState): string | null {
  if (!form.name.trim()) return "\u540d\u79f0\u4e0d\u80fd\u4e3a\u7a7a"
  if (!form.apiUrl.trim()) return "API URL \u4e0d\u80fd\u4e3a\u7a7a"
  if (!form.apiKey.trim()) return "API KEY \u4e0d\u80fd\u4e3a\u7a7a"
  try {
    new URL(form.apiUrl.trim())
  } catch {
    return "API URL \u683c\u5f0f\u4e0d\u6b63\u786e"
  }
  return null
}

export function SearchPage() {
  const modelConfigs = useModelConfigList()
  const createModel = useCreateModelConfig()
  const updateModel = useUpdateModelConfig()
  const deleteModel = useDeleteModelConfig()

  const [editing, setEditing] = useState<ModelConfig | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(initialFormState)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ModelConfig | null>(null)

  const submitting = createModel.isPending || updateModel.isPending
  const list = modelConfigs.data ?? []
  const countLabel = useMemo(() => `${list.length} \u4e2a\u6a21\u578b`, [list.length])
  const loadErrorText = modelConfigs.error instanceof Error ? modelConfigs.error.message : ""

  function openCreate() {
    setEditing(null)
    setForm(initialFormState())
    setError(null)
    setOpen(true)
  }

  function openEdit(item: ModelConfig) {
    setEditing(item)
    setForm({
      name: item.name,
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
      name: form.name.trim(),
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
      setError(e instanceof Error ? e.message : "\u4fdd\u5b58\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5")
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    await deleteModel.mutateAsync({ id: deleting.id })
    setDeleting(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">{"\u6a21\u578b"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{"\u7ba1\u7406\u6a21\u578b\u914d\u7f6e\uff0c\u5f53\u524d\u4ec5\u652f\u6301\u767e\u70bc\u4f9b\u5e94\u5546\u3002"}</p>
        </div>
        <button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground" onClick={openCreate}>
          {"\u6dfb\u52a0\u6a21\u578b"}
        </button>
      </div>

      <div className="text-sm text-muted-foreground">{countLabel}</div>

      {modelConfigs.isLoading ? (
        <div className="rounded-lg border bg-background px-4 py-10 text-center text-sm text-muted-foreground">{"\u52a0\u8f7d\u4e2d..."}</div>
      ) : modelConfigs.isError ? (
        <div className="rounded-lg border bg-background px-4 py-10 text-center text-sm text-destructive">
          {"\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u540e\u7aef\u670d\u52a1\u3002"}
          {loadErrorText ? <div className="mt-2 text-xs text-muted-foreground">{loadErrorText}</div> : null}
        </div>
      ) : list.length ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium">{"\u540d\u79f0"}</th>
                <th className="px-3 py-2 text-left font-medium">{"\u4f9b\u5e94\u5546"}</th>
                <th className="px-3 py-2 text-left font-medium">API URL</th>
                <th className="px-3 py-2 text-left font-medium">API KEY</th>
                <th className="px-3 py-2 text-left font-medium">{"\u64cd\u4f5c"}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2">{item.provider === "aliyun-bailian" ? "\u767e\u70bc" : item.provider}</td>
                  <td className="max-w-72 truncate px-3 py-2" title={item.apiUrl}>
                    {item.apiUrl}
                  </td>
                  <td className="px-3 py-2">{item.apiKeyMasked}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button className="rounded-md border px-2 py-1 hover:bg-muted/60" onClick={() => openEdit(item)}>
                        {"\u7f16\u8f91"}
                      </button>
                      <button
                        className="rounded-md border border-destructive/40 px-2 py-1 text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleting(item)}
                      >
                        {"\u5220\u9664"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border bg-background px-4 py-10 text-center text-sm text-muted-foreground">{"\u6682\u65e0\u6a21\u578b\u914d\u7f6e\uff0c\u5148\u6dfb\u52a0\u4e00\u4e2a\u5427\u3002"}</div>
      )}

      <Dialog open={open} onOpenChange={(next) => !next && closeDialog()} title={editing ? "\u7f16\u8f91\u6a21\u578b" : "\u6dfb\u52a0\u6a21\u578b"}>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium">
              {"\u540d\u79f0"} <span className="text-destructive">*</span>
            </label>
            <input
              className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={"\u4f8b\u5982\uff1a\u9ed8\u8ba4\u767e\u70bc\u6a21\u578b"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              {"\u4f9b\u5e94\u5546"} <span className="text-destructive">*</span>
            </label>
            <Select
              className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
              value={form.provider}
              onValueChange={(v) => setForm((prev) => ({ ...prev, provider: v as ModelProvider }))}
              options={[{ label: "\u767e\u70bc", value: "aliyun-bailian" }]}
              modal={false}
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
              placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
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
              placeholder={editing ? "\u7f16\u8f91\u65f6\u8bf7\u91cd\u65b0\u8f93\u5165 API KEY" : "\u8bf7\u8f93\u5165 API KEY"}
            />
          </div>

          {error ? <div className="text-sm text-destructive">{error}</div> : null}

          <div className="flex justify-end gap-2">
            <button className="rounded-md border px-3 py-2 text-sm hover:bg-muted/60" onClick={closeDialog} disabled={submitting}>
              {"\u53d6\u6d88"}
            </button>
            <button
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? "\u4fdd\u5b58\u4e2d..." : "\u4fdd\u5b58"}
            </button>
          </div>
        </div>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        description={deleting ? `\u5c06\u5220\u9664\u6a21\u578b\u914d\u7f6e\u300c${deleting.name}\u300d\uff0c\u6b64\u64cd\u4f5c\u4e0d\u53ef\u6062\u590d\u3002` : undefined}
        errorText={deleteModel.isError ? "\u5220\u9664\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5\u3002" : null}
        confirming={deleteModel.isPending}
      />
    </div>
  )
}
