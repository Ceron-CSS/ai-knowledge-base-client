import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip"
import type { ReactElement, ReactNode } from "react"
import { useId } from "react"

import { cn } from "@/lib/utils"

type TooltipProps = {
  content: ReactNode
  children: ReactElement
  className?: string
  side?: "top" | "left"
}

export function Tooltip({ content, children, className, side = "top" }: TooltipProps) {
  const tooltipId = useId()

  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger aria-describedby={tooltipId} delay={300} render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={8} className="z-[10000]">
          <BaseTooltip.Popup
            id={tooltipId}
            role="tooltip"
            className={cn(
              "max-w-80 rounded-md bg-[#242424] px-3 py-2 text-xs font-medium text-white shadow-lg",
              className,
            )}
          >
            {content}
            <BaseTooltip.Arrow className="h-2 w-2 rotate-45 bg-[#242424]" />
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  )
}
