import type { ModelConfig, ModelProvider } from "@/api/models"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { MODEL_PROVIDERS } from "@/features/modelProviders/constants/providers"
import type { ModelProviderFormState } from "@/features/modelProviders/types"

type ModelProviderFormDialogProps = {
  open: boolean
  editing: ModelConfig | null
  form: ModelProviderFormState
  usedProviders: Set<ModelProvider>
  error: string | null
  submitting: boolean
  onClose: () => void
  onSubmit: () => void
  onFormChange: (updater: (prev: ModelProviderFormState) => ModelProviderFormState) => void
}

export function ModelProviderFormDialog({
  open,
  editing,
  form,
  usedProviders,
  error,
  submitting,
  onClose,
  onSubmit,
  onFormChange,
}: ModelProviderFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} title={editing ? "编辑供应商配置" : "添加供应商配置"}>
      <div className="grid gap-4">
        <div>
          <label className="block text-sm font-medium">
            供应商 <span className="text-destructive">*</span>
          </label>
          <Select
            className="mt-2"
            value={form.provider}
            onValueChange={(value) => {
              const next = value as ModelProvider
              const defaultApiUrl = MODEL_PROVIDERS.find((provider) => provider.value === next)?.defaultApiUrl ?? ""
              onFormChange((prev) => ({ ...prev, provider: next, apiUrl: editing ? prev.apiUrl : defaultApiUrl }))
            }}
            options={
              editing
                ? MODEL_PROVIDERS.map((provider) => ({ label: provider.label, value: provider.value }))
                : MODEL_PROVIDERS.map((provider) => ({
                    label: usedProviders.has(provider.value) ? `${provider.label}（已配置）` : provider.label,
                    value: provider.value,
                    disabled: usedProviders.has(provider.value),
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
          <Input
            className="mt-2"
            value={form.apiUrl}
            onChange={(e) => onFormChange((prev) => ({ ...prev, apiUrl: e.target.value }))}
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            API KEY {!editing ? <span className="text-destructive">*</span> : null}
          </label>
          <Input
            type="password"
            className="mt-2"
            value={form.apiKey}
            onChange={(e) => onFormChange((prev) => ({ ...prev, apiKey: e.target.value }))}
            placeholder={editing ? "留空则保留当前 API KEY" : "请输入 API KEY"}
          />
        </div>

        {error ? <div className="text-sm text-destructive">{error}</div> : null}

        <div className="flex justify-end gap-3">
          <Button
            variant="dialog-cancel"
            size="dialog"
            onPointerDown={(e) => {
              if (e.button !== 0) return
              e.preventDefault()
              onClose()
            }}
            onClick={(e) => {
              // Keyboard activation doesn't fire pointer events.
              if (e.detail === 0) onClose()
            }}
            disabled={submitting}
          >
            取消
          </Button>
          <Button variant="primary" size="dialog" onClick={onSubmit} loading={submitting}>
            保存
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
