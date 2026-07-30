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
          <div>
            {title ? <div className="text-base font-semibold">{title}</div> : null}
            {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
          </div>
        )}

        <div className="mt-4">{children}</div>
        {footer ? <div className="mt-4 flex justify-end gap-3">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
