import type { ComponentProps, ReactNode } from "react"

import { LoadingSkeleton } from "@/components/ui/skeleton"

type LoadingTextProps = ComponentProps<"div"> & {
  children?: ReactNode
  delayMs?: number
  lines?: number
}

function LoadingText({ lines = 3, ...props }: LoadingTextProps) {
  return <LoadingSkeleton lines={lines} {...props} />
}

export { LoadingText }
