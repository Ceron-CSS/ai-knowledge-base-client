import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

type TypingDotsProps = ComponentProps<"span">

function TypingDots({ className, ...props }: TypingDotsProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 py-1 text-muted-foreground", className)}
      aria-label="正在生成回复"
      role="status"
      {...props}
    >
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
    </span>
  )
}

export { TypingDots }
