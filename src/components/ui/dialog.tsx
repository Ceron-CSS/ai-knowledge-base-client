import { useEffect } from "react"
import { createPortal } from "react-dom"

export type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function Dialog({ open, onOpenChange, title, description, children, footer }: DialogProps) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onOpenChange])

  if (!open) return null
  if (typeof document === "undefined") return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
        type="button"
      />
      <div className="relative w-full max-w-2xl rounded-lg border bg-background p-5 shadow-lg">
        {(title || description) && (
          <div className="pr-10">
            {title ? <div className="text-base font-semibold">{title}</div> : null}
            {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
          </div>
        )}

        <button
          aria-label="Close"
          className="absolute right-3 top-3 rounded-md border px-2 py-1 text-sm hover:bg-muted/60"
          onClick={() => onOpenChange(false)}
          type="button"
        >
          关闭
        </button>

        <div className="mt-4">{children}</div>
        {footer ? <div className="mt-4 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
