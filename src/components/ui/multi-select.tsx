import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type MultiSelectOption = {
  label: string
  value: string
  disabled?: boolean
}

type MultiSelectProps = {
  value: string[]
  onValueChange: (values: string[]) => void
  options: MultiSelectOption[]
  placeholder?: string
  disabled?: boolean
  searchPlaceholder?: string
  emptyText?: string
  className?: string
}

export function MultiSelect({
  value,
  onValueChange,
  options,
  placeholder = "请选择",
  disabled = false,
  searchPlaceholder = "搜索...",
  emptyText = "无匹配项",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedSet = useMemo(() => new Set(value), [value])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, search])

  const selectedLabel = useMemo(() => {
    if (!value.length) return null
    const names = value
      .map((id) => options.find((o) => o.value === id)?.label)
      .filter(Boolean) as string[]
    if (names.length <= 2) return names.join("、")
    return `已选 ${names.length} 项`
  }, [value, options])

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!open) return
      const t = e.target as Node | null
      if (t && containerRef.current && containerRef.current.contains(t)) return
      setOpen(false)
      setSearch("")
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onMouseDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  // Focus search input on open
  useEffect(() => {
    if (open) {
      // small delay to let the popup render
      const id = setTimeout(() => searchInputRef.current?.focus(), 0)
      return () => clearTimeout(id)
    }
  }, [open])

  function toggle(v: string) {
    const opt = options.find((o) => o.value === v)
    if (opt?.disabled) return
    if (selectedSet.has(v)) {
      onValueChange(value.filter((x) => x !== v))
    } else {
      onValueChange([...value, v])
    }
  }

  function removeTag(v: string, e: React.MouseEvent) {
    e.stopPropagation()
    onValueChange(value.filter((x) => x !== v))
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        className={cn(
          "flex min-h-10 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm outline-none transition",
          "focus-visible:ring-2 focus-visible:ring-ring/50",
          disabled && "cursor-not-allowed opacity-50",
        )}
        onClick={() => {
          if (disabled) return
          setOpen((v) => !v)
        }}
        disabled={disabled}
      >
        <span className={cn("min-w-0 flex-1 text-left", !selectedLabel && "text-muted-foreground")}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="absolute left-0 z-50 mt-1.5 w-full min-w-[var(--anchor-width)] rounded-md border bg-popover text-popover-foreground shadow-md">
          {/* Search */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={searchInputRef}
              className="flex-1 border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>

          {/* List */}
          <div className="max-h-56 overflow-auto p-1">
            {filtered.length
              ? filtered.map((o) => {
                  const sel = selectedSet.has(o.value)
                  return (
                    <button
                      key={o.value}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none",
                        o.disabled
                          ? "cursor-not-allowed opacity-50"
                          : "hover:bg-accent hover:text-accent-foreground",
                      )}
                      onClick={() => toggle(o.value)}
                      disabled={o.disabled}
                    >
                      <span
                        className={cn(
                          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          sel
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30",
                        )}
                      >
                        {sel ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="truncate">{o.label}</span>
                      {o.disabled ? (
                        <span className="shrink-0 text-xs text-muted-foreground">已停用</span>
                      ) : null}
                    </button>
                  )
                })
              : (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">{emptyText}</div>
            )}
          </div>

          {/* Footer */}
          {value.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 border-t p-2">
              {value.map((id) => {
                const label = options.find((o) => o.value === id)?.label ?? id
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
                  >
                    <span className="max-w-32 truncate">{label}</span>
                    <button
                      type="button"
                      className="inline-flex shrink-0 items-center justify-center rounded-full p-0.5 hover:bg-muted-foreground/20"
                      onClick={(e) => removeTag(id, e)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
