import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"

export type SearchableSelectOption = {
  label: string
  value: string
  disabled?: boolean
}

type SearchableSelectProps = {
  value: string
  onValueChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  disabled?: boolean
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  hasMore?: boolean
  onLoadMore?: () => void
  loadingMore?: boolean
  searching?: boolean
}

export function SearchableSelect({
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
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [internalSearch, setInternalSearch] = useState("")
  const [knownSelected, setKnownSelected] = useState<SearchableSelectOption | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const serverSearch = typeof onSearchChange === "function"
  const search = serverSearch ? (searchValue ?? "") : internalSearch

  const matchedOption = options.find((o) => o.value === value) ?? null
  if (matchedOption && matchedOption !== knownSelected) {
    if (
      !knownSelected ||
      knownSelected.value !== matchedOption.value ||
      knownSelected.label !== matchedOption.label ||
      knownSelected.disabled !== matchedOption.disabled
    ) {
      setKnownSelected(matchedOption)
    }
  } else if (!value && knownSelected) {
    setKnownSelected(null)
  } else if (value && knownSelected && knownSelected.value !== value && !matchedOption) {
    setKnownSelected(null)
  }

  const filtered = useMemo(() => {
    if (serverSearch) return options
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, search, serverSearch])

  const displayLabel = matchedOption?.label ?? knownSelected?.label ?? null

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
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm outline-none transition",
          "focus-visible:ring-2 focus-visible:ring-ring/50",
          disabled && "cursor-not-allowed opacity-50",
        )}
        onClick={() => {
          if (disabled) return
          setOpen((v) => !v)
        }}
        disabled={disabled}
      >
        <span className={cn("min-w-0 flex-1 truncate text-left", !displayLabel && "text-muted-foreground")}>
          {displayLabel ?? placeholder}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="absolute left-0 z-50 mt-1.5 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
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

          <div ref={listRef} className="max-h-64 overflow-auto p-1" onScroll={handleListScroll}>
            {filtered.length
              ? filtered.map((option) => {
                  const selected = option.value === value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "relative flex w-full cursor-pointer items-center rounded-sm py-2 pl-8 pr-3 text-sm outline-none",
                        option.disabled
                          ? "cursor-not-allowed opacity-50"
                          : "hover:bg-accent hover:text-accent-foreground",
                      )}
                      disabled={option.disabled}
                      onClick={() => {
                        if (option.disabled) return
                        setKnownSelected(option)
                        onValueChange(option.value)
                        setOpen(false)
                        if (!serverSearch) setInternalSearch("")
                      }}
                    >
                      {selected ? (
                        <span className="absolute left-2 inline-flex h-4 w-4 items-center justify-center">
                          <Check className="h-4 w-4" />
                        </span>
                      ) : null}
                      <span className="truncate">{option.label}</span>
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
        </div>
      ) : null}
    </div>
  )
}
