import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

type TextareaProps = ComponentProps<"textarea">

const textareaClassName =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/15"

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cn(textareaClassName, className)} {...props} />
}
