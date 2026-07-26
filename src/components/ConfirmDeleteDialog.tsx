import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"

export type ConfirmDeleteDialogProps = {
  open: boolean
  title?: string
  description?: string
  errorText?: string | null
  confirmLabel?: string
  cancelLabel?: string
  confirming?: boolean
  children?: React.ReactNode
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDeleteDialog({
  open,
  title = "确认删除",
  description,
  errorText,
  confirmLabel = "确认删除",
  cancelLabel = "取消",
  confirming = false,
  children,
  onCancel,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
      title={title}
      description={children ? undefined : description}
    >
      {children ?? null}
      {errorText ? <div className={children ? "mt-3 text-sm text-destructive" : "text-sm text-destructive"}>{errorText}</div> : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" size="lg" onClick={onCancel} disabled={confirming}>
          {cancelLabel}
        </Button>
        <Button variant="destructive" size="lg" onClick={onConfirm} loading={confirming}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
