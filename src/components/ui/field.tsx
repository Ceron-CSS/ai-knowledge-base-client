import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type FieldProps = {
  label: ReactNode
  error?: ReactNode
  className?: string
  children: ReactNode
}

export function Field({ label, error, className, children }: FieldProps) {
  return (
    <div className={cn(className)}>
      <label className="block text-sm font-medium">{label}</label>
      <div className="mt-1.5">{children}</div>
      {error ? <div className="mt-1.5 text-sm text-destructive">{error}</div> : null}
    </div>
  )
}
