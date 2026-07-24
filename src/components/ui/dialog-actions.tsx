import { LoaderCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export type DialogActionsProps = {
  cancelLabel?: string
  confirmLabel: string
  pending?: boolean
  confirmDisabled?: boolean
  cancelDisabled?: boolean
  tone?: "danger" | "primary"
  className?: string
  onCancel: () => void
  onConfirm: () => void
}

const cancelButtonClassName =
  "inline-flex h-10 min-w-24 items-center justify-center rounded-md bg-[rgb(244,247,250)] px-5 text-sm font-medium text-slate-900 transition-colors hover:bg-[rgb(232,237,243)] disabled:pointer-events-none disabled:opacity-50"

const confirmButtonClassNames = {
  danger:
    "inline-flex h-10 min-w-24 items-center justify-center rounded-md bg-[rgb(242,80,80)] px-5 text-sm font-medium text-white transition-colors hover:bg-[rgb(226,67,67)] disabled:pointer-events-none disabled:opacity-50",
  primary:
    "inline-flex h-10 min-w-24 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50",
}

export function DialogActions({
  cancelLabel = "取消",
  confirmLabel,
  pending = false,
  confirmDisabled = false,
  cancelDisabled,
  tone = "danger",
  className,
  onCancel,
  onConfirm,
}: DialogActionsProps) {
  const isCancelDisabled = cancelDisabled ?? pending

  return (
    <div className={cn("mt-4 flex justify-end gap-3", className)}>
      <button
        className={cancelButtonClassName}
        onClick={onCancel}
        disabled={isCancelDisabled}
        type="button"
      >
        {cancelLabel}
      </button>
      <button
        className={confirmButtonClassNames[tone]}
        onClick={onConfirm}
        disabled={pending || confirmDisabled}
        type="button"
      >
        {pending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
        {confirmLabel}
      </button>
    </div>
  )
}
