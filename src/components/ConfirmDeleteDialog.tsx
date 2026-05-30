import { Dialog } from "@/components/ui/dialog"

export type ConfirmDeleteDialogProps = {
  open: boolean
  title?: string
  description?: string
  errorText?: string | null
  confirmLabel?: string
  cancelLabel?: string
  confirming?: boolean
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
      description={description}
    >
      {errorText ? <div className="text-sm text-destructive">{errorText}</div> : null}
      <div className="mt-4 flex justify-end gap-2">
        <button className="rounded-md border px-3 py-2 text-sm hover:bg-muted/60" onClick={onCancel} disabled={confirming}>
          {cancelLabel}
        </button>
        <button
          className="rounded-md border border-destructive/40 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
          onClick={onConfirm}
          disabled={confirming}
        >
          {confirming ? "删除中..." : confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
