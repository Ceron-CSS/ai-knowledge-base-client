import { X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts, dismiss } = useToast()

  if (!toasts.length) return null

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[100] -translate-x-1/2 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={[
            "pointer-events-auto min-w-[280px] max-w-[420px] rounded-md border bg-background/95 px-3 py-2 shadow-md",
            toast.variant === "destructive" ? "border-destructive/30 text-destructive" : "border-border",
          ].join(" ")}
          role="status"
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {toast.title ? <div className="text-sm font-medium">{toast.title}</div> : null}
              {toast.description ? <div className="text-sm">{toast.description}</div> : null}
            </div>
            <button
              type="button"
              className="rounded p-0.5 opacity-70 hover:bg-muted/60 hover:opacity-100"
              onClick={() => dismiss(toast.id)}
              aria-label="关闭提示"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
