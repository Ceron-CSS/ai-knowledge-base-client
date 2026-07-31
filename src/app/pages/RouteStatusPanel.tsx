import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type RouteStatusPanelProps = {
  code?: string
  title: string
  description: string
  actions: ReactNode
  layout?: "embedded" | "fullscreen"
}

export function RouteStatusPanel({
  code,
  title,
  description,
  actions,
  layout = "embedded",
}: RouteStatusPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-4 text-center",
        layout === "fullscreen" ? "min-h-svh" : "min-h-[60vh]",
      )}
    >
      {code ? <p className="text-6xl font-semibold text-muted-foreground">{code}</p> : null}
      <h1 className="text-xl font-medium">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div>
    </div>
  )
}
