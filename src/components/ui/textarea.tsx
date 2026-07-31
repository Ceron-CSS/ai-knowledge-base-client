import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

type TextareaProps = ComponentProps<"textarea">

const textareaClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-200/60"

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cn(textareaClassName, className)} {...props} />
}
