import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type TooltipProps = {
  content: ReactNode
  children: ReactNode
  className?: string
}

export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 z-[9999] mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#242424] px-3 py-2 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/tooltip:block group-hover/tooltip:opacity-100 group-focus-within/tooltip:block group-focus-within/tooltip:opacity-100",
          "after:absolute after:left-1/2 after:top-full after:h-0 after:w-0 after:-translate-x-1/2 after:border-x-[7px] after:border-t-[7px] after:border-x-transparent after:border-t-[#242424]",
          className,
        )}
      >
        {content}
      </span>
    </span>
  )
}
