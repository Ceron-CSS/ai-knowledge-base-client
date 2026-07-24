import type { ChangeEvent, ComponentProps } from "react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

type InputProps = ComponentProps<"input"> & {
  clearable?: boolean
}

export function Input({ className, clearable, value, onChange, ...props }: InputProps) {
  const showClear = clearable && String(value ?? "").length > 0

  if (!clearable) {
    return (
      <input
        className={cn(
          "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2",
          className,
        )}
        value={value}
        onChange={onChange}
        {...props}
      />
    )
  }

  return (
    <div className={cn("relative w-52 shrink-0", className)}>
      <input
        className={cn(
          "w-full rounded-md border bg-background py-2 pl-3 text-sm outline-none focus:ring-2",
          showClear ? "pr-8" : "pr-3",
        )}
        value={value}
        onChange={onChange}
        {...props}
      />
      {showClear ? (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
          onClick={() =>
            onChange?.({
              target: { value: "" },
              currentTarget: { value: "" },
            } as ChangeEvent<HTMLInputElement>)
          }
          aria-label="清除"
          title="清除"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}
