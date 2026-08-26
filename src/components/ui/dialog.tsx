import { Dialog as BaseDialog } from "@base-ui/react/dialog"

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
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange} modal>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-black/40" />
        <BaseDialog.Viewport
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center overflow-y-auto",
            fullscreen ? "p-0" : "p-4",
          )}
        >
          <BaseDialog.Popup
            className={cn(
              "relative flex w-full flex-col border border-border bg-card shadow-lg outline-none",
              fullscreen
                ? "h-dvh max-w-none rounded-none p-4"
                : "max-w-2xl rounded-lg p-5",
              contentClassName,
            )}
          >
            {(title || description || headerActions) && (
              <div className="flex shrink-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  {title ? (
                    <BaseDialog.Title className="text-base font-semibold">
                      {title}
                    </BaseDialog.Title>
                  ) : null}
                  {description ? (
                    <BaseDialog.Description className="text-sm text-muted-foreground">
                      {description}
                    </BaseDialog.Description>
                  ) : null}
                </div>
                {headerActions ? (
                  <div className="flex shrink-0 items-center gap-2">{headerActions}</div>
                ) : null}
              </div>
            )}

            <div className={cn("mt-4", bodyClassName)}>{children}</div>
            {footer ? (
              <div className="mt-4 flex shrink-0 justify-end gap-3">{footer}</div>
            ) : null}
            <BaseDialog.Close className="sr-only">关闭弹窗</BaseDialog.Close>
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  )
}
