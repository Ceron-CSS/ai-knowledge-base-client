import type { ComponentProps, ReactNode } from "react"
import { LoaderCircle } from "lucide-react"

import { cn } from "@/lib/utils"

type LoadingTextProps = ComponentProps<"div"> & {
  children?: ReactNode
}

function LoadingText({ className, children = "加载中", ...props }: LoadingTextProps) {
  return (
    <div
      className={cn("inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground", className)}
      {...props}
    >
      <LoaderCircle className="h-4 w-4 animate-spin" />
      <span>{children}</span>
    </div>
  )
}

export { LoadingText }
