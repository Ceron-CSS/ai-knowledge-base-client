import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

type TooltipProps = {
  content: ReactNode
  children: ReactNode
  className?: string
  side?: "top" | "left"
}

export function Tooltip({ content, children, className, side = "top" }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ left: 0, top: 0, arrowLeft: "50%", arrowTop: "50%" })

  useLayoutEffect(() => {
    if (!open) return

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const tooltipWidth = tooltipRef.current?.offsetWidth ?? 0
      const tooltipHeight = tooltipRef.current?.offsetHeight ?? 0
      const triggerCenter = rect.left + rect.width / 2
      const triggerMiddle = rect.top + rect.height / 2
      const viewportMargin = 8
      let left = side === "left" ? rect.left - 8 : triggerCenter
      let top = side === "left" ? triggerMiddle : rect.top - 8
      let arrowLeft: string | number = "50%"
      let arrowTop: string | number = "50%"

      if (side === "left" && tooltipHeight > 0) {
        const halfHeight = tooltipHeight / 2
        const minTop = viewportMargin + halfHeight
        const maxTop = window.innerHeight - viewportMargin - halfHeight
        top = Math.min(Math.max(triggerMiddle, minTop), Math.max(minTop, maxTop))
        arrowTop = Math.min(Math.max(triggerMiddle - (top - halfHeight), 12), tooltipHeight - 12)
      } else if (tooltipWidth > 0) {
        const halfWidth = tooltipWidth / 2
        const minLeft = viewportMargin + halfWidth
        const maxLeft = window.innerWidth - viewportMargin - halfWidth
        left = Math.min(Math.max(triggerCenter, minLeft), Math.max(minLeft, maxLeft))
        arrowLeft = Math.min(Math.max(triggerCenter - (left - halfWidth), 12), tooltipWidth - 12)
      }

      setPosition({
        left,
        top,
        arrowLeft: typeof arrowLeft === "number" ? `${arrowLeft}px` : arrowLeft,
        arrowTop: typeof arrowTop === "number" ? `${arrowTop}px` : arrowTop,
      })
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)

    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [open])

  return (
    <span
      ref={triggerRef}
      className="inline-flex"
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open
        ? createPortal(
            <span
              ref={tooltipRef}
              role="tooltip"
              style={
                {
                  left: position.left,
                  top: position.top,
                  "--tooltip-arrow-left": position.arrowLeft,
                  "--tooltip-arrow-top": position.arrowTop,
                } as CSSProperties
              }
              className={cn(
                "pointer-events-none fixed z-[10000] whitespace-nowrap rounded-md bg-[#242424] px-3 py-2 text-xs font-medium text-white opacity-100 shadow-lg",
                side === "left"
                  ? "-translate-x-full -translate-y-1/2 after:absolute after:left-full after:top-[var(--tooltip-arrow-top)] after:h-0 after:w-0 after:-translate-y-1/2 after:border-y-[7px] after:border-l-[7px] after:border-y-transparent after:border-l-[#242424]"
                  : "-translate-x-1/2 -translate-y-full after:absolute after:left-[var(--tooltip-arrow-left)] after:top-full after:h-0 after:w-0 after:-translate-x-1/2 after:border-x-[7px] after:border-t-[7px] after:border-x-transparent after:border-t-[#242424]",
                className,
              )}
            >
              {content}
            </span>,
            document.body,
          )
        : null}
    </span>
  )
}
