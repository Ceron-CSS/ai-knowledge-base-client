import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export type EvalDatasetEditing =
  | { mode: "none" }
  | { mode: "create" }
  | { mode: "edit"; id: string }

type EvalDatasetFormDialogProps = {
  editing: EvalDatasetEditing
  name: string
  description: string
  isSaving: boolean
  hasError: boolean
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onCancel: () => void
  onSubmit: () => void
}

export function EvalDatasetFormDialog({
  editing,
  name,
  description,
  isSaving,
  hasError,
  onNameChange,
  onDescriptionChange,
  onCancel,
  onSubmit,
}: EvalDatasetFormDialogProps) {
  return (
    <Dialog
      open={editing.mode !== "none"}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
      title={editing.mode === "create" ? "创建实验数据集" : editing.mode === "edit" ? "编辑数据集" : undefined}
      description="数据集用于组织实验问题与相关 Chunk 标签"
    >
      <div className="grid gap-4">
        <div>
          <label className="block text-sm font-medium">
            名称 <span className="text-destructive">*</span>
          </label>
          <Input
            className="mt-2"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="例如：产品 FAQ 实验集"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">说明</label>
          <Textarea
            className="mt-2 min-h-24 resize-y"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="可选，例如：覆盖退款与账号相关问题"
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
          {editing.mode === "edit" ? "保存" : "创建"}
        </Button>
      </div>
    </Dialog>
  )
}
