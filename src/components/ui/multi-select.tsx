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
  /** Controlled search for server-side filtering. When set with onSearchChange, client-side filtering is skipped. */
  searchValue?: string
  onSearchChange?: (value: string) => void
  hasMore?: boolean
  onLoadMore?: () => void
  loadingMore?: boolean
  searching?: boolean
}

function mergeKnownSelected(
  prev: Map<string, MultiSelectOption>,
  value: string[],
  options: MultiSelectOption[],
) {
  const next = new Map(prev)
  let changed = false
  for (const opt of options) {
    if (!value.includes(opt.value)) continue
    const existing = next.get(opt.value)
    if (!existing || existing.label !== opt.label || existing.disabled !== opt.disabled) {
      next.set(opt.value, opt)
      changed = true
    }
  }
  for (const id of [...next.keys()]) {
    if (!value.includes(id)) {
      next.delete(id)
      changed = true
    }
  }
  return changed ? next : prev
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
  searchValue,
  onSearchChange,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  searching = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [internalSearch, setInternalSearch] = useState("")
  const [knownSelected, setKnownSelected] = useState(() => new Map<string, MultiSelectOption>())
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const serverSearch = typeof onSearchChange === "function"
  const search = serverSearch ? (searchValue ?? "") : internalSearch

  const selectedSet = useMemo(() => new Set(value), [value])

  const [prevSyncKey, setPrevSyncKey] = useState("")
  const syncKey = `${value.join(",")}::${options.map((o) => `${o.value}:${o.label}:${o.disabled ? 1 : 0}`).join("|")}`
  if (syncKey !== prevSyncKey) {
    setPrevSyncKey(syncKey)
    const merged = mergeKnownSelected(knownSelected, value, options)
    if (merged !== knownSelected) setKnownSelected(merged)
  }

  const filtered = useMemo(() => {
    if (serverSearch) return options
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, search, serverSearch])

  const selectedLabel = useMemo(() => {
    if (!value.length) return null
    const names = value.map((id) => knownSelected.get(id)?.label).filter(Boolean) as string[]
    if (!names.length) return `已选 ${value.length} 项`
    if (names.length <= 2) return names.join("、")
    return `已选 ${names.length} 项`
  }, [value, knownSelected])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!open) return
      const t = e.target as Node | null
      if (t && containerRef.current && containerRef.current.contains(t)) return
      setOpen(false)
      if (!serverSearch) setInternalSearch("")
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false)
        if (!serverSearch) setInternalSearch("")
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onMouseDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open, serverSearch])

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => searchInputRef.current?.focus(), 0)
      return () => clearTimeout(id)
    }
  }, [open])

  function setSearch(next: string) {
    if (serverSearch) onSearchChange?.(next)
    else setInternalSearch(next)
  }

  function resolveOption(v: string) {
    return options.find((o) => o.value === v) ?? knownSelected.get(v)
  }

  function toggle(v: string) {
    const opt = resolveOption(v)
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

  function handleListScroll() {
    if (!onLoadMore || !hasMore || loadingMore) return
    const el = listRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) {
      onLoadMore()
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        className={cn(
          "flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none transition",
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

          <div ref={listRef} className="max-h-56 overflow-auto p-1" onScroll={handleListScroll}>
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
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                {searching ? "搜索中…" : emptyText}
              </div>
            )}
            {hasMore ? (
              <button
                type="button"
                className="mt-1 w-full rounded-sm px-3 py-2 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
                onClick={() => onLoadMore?.()}
                disabled={loadingMore}
              >
                {loadingMore ? "加载中…" : "加载更多"}
              </button>
            ) : null}
          </div>

          {value.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 border-t p-2">
              {value.map((id) => {
                const label = knownSelected.get(id)?.label ?? id
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
