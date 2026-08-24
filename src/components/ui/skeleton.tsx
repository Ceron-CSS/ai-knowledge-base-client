import type { ComponentProps } from "react"

import {
  DEFAULT_LOADING_DELAY_MS,
  useDelayedLoading,
} from "@/hooks/useDelayedLoading"
import { cn } from "@/lib/utils"

type SkeletonProps = ComponentProps<"div">

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted/80", className)}
      {...props}
    />
  )
}

type LoadingSkeletonProps = ComponentProps<"div"> & {
  loading?: boolean
  delayMs?: number
  lines?: number
}

function LoadingSkeleton({
  className,
  loading = true,
  delayMs = DEFAULT_LOADING_DELAY_MS,
  lines = 3,
  ...props
}: LoadingSkeletonProps) {
  const show = useDelayedLoading(loading, delayMs)

  if (!show) return null

  return (
    <div className={cn("w-full space-y-2", className, "block")} {...props}>
      {Array.from({ length: Math.max(1, lines) }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "h-4 w-full",
            index === lines - 1 && lines > 1 ? "w-3/4" : null,
            index === lines - 2 && lines > 2 ? "w-11/12" : null
          )}
        />
      ))}
    </div>
  )
}

type SkeletonPanelProps = ComponentProps<"div"> & {
  loading?: boolean
  delayMs?: number
  rows?: number
}

function SkeletonPanel({
  className,
  loading = true,
  delayMs = DEFAULT_LOADING_DELAY_MS,
  rows = 5,
  ...props
}: SkeletonPanelProps) {
  const show = useDelayedLoading(loading, delayMs)

  if (!show) return null

  return (
    <div
      className={cn(
        "w-full rounded-lg border border-border bg-card p-4 shadow-sm",
        className,
        "block"
      )}
      {...props}
    >
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3 max-w-72" />
        <div className="space-y-3">
          {Array.from({ length: Math.max(1, rows) }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton
                className={cn(
                  "h-4 w-10/12",
                  index % 2 === 0 ? "w-11/12" : "w-8/12"
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export { LoadingSkeleton, Skeleton, SkeletonPanel }
