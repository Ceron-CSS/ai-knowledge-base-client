import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2",
        className,
      )}
      {...props}
    />
  )
}
