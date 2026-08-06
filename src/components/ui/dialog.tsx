import { useEffect } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

export type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  contentClassName?: string
  bodyClassName?: string
  /** 铺满视口，用于预览等需要更大可视区域的场景 */
  fullscreen?: boolean
  headerActions?: React.ReactNode
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClassName,
  bodyClassName,
  fullscreen = false,
  headerActions,
}: DialogProps) {
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
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        fullscreen ? "p-0" : "p-4",
      )}
    >
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
        type="button"
      />
      <div
        className={cn(
          "relative flex w-full flex-col border border-border bg-card shadow-lg",
          fullscreen
            ? "h-dvh max-w-none rounded-none p-4"
            : "max-w-2xl rounded-lg p-5",
          contentClassName,
        )}
      >
        {(title || description || headerActions) && (
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div className="min-w-0">
              {title ? <div className="text-base font-semibold">{title}</div> : null}
              {description ? (
                <div className="text-sm text-muted-foreground">{description}</div>
              ) : null}
            </div>
            {headerActions ? <div className="flex shrink-0 items-center gap-2">{headerActions}</div> : null}
          </div>
        )}

        <div className={cn("mt-4", bodyClassName)}>{children}</div>
        {footer ? <div className="mt-4 flex shrink-0 justify-end gap-3">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
