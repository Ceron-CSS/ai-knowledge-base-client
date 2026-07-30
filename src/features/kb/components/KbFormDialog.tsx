import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import type { KbEditingState } from "@/features/kb/types"

type KbFormDialogProps = {
  editing: KbEditingState
  name: string
  description: string
  isSaving: boolean
  hasError: boolean
  submitLabel: string
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onCancel: () => void
  onSubmit: () => void
}

export function KbFormDialog({
  editing,
  name,
  description,
  isSaving,
  hasError,
  submitLabel,
  onNameChange,
  onDescriptionChange,
  onCancel,
  onSubmit,
}: KbFormDialogProps) {
  return (
    <Dialog
      open={editing.mode !== "none"}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
      title={editing.mode === "create" ? "创建知识库" : editing.mode === "edit" ? "编辑知识库" : undefined}
    >
      <div className="grid gap-4">
        <div>
          <label className="block text-sm font-medium">
            名称 <span className="text-destructive">*</span>
          </label>
          <input
            className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="例如：产品文档库"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">描述</label>
          <textarea
            className="mt-2 min-h-24 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="可选，例如：用于存放 PRD/需求/FAQ"
            rows={4}
          />
        </div>
      </div>

      {hasError ? <div className="mt-3 text-sm text-destructive">操作失败，请稍后重试</div> : null}

      <div className="mt-4 flex justify-end gap-3">
        <Button variant="dialog-cancel" size="dialog" onClick={onCancel} disabled={isSaving}>
          取消
        </Button>
        <Button
          variant="primary"
          size="dialog"
          onClick={onSubmit}
          disabled={!name.trim()}
          loading={isSaving}
        >
          {submitLabel}
        </Button>
      </div>
    </Dialog>
  )
}
