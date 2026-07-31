import { useMemo, useState } from "react"
import type { Kb } from "@/api/kb"
import { useKbFeed, type KbFeedParams } from "@/features/kb/hooks/queries"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import type { MultiSelectOption } from "@/components/ui/multi-select"
import type { SelectOption } from "@/components/ui/select"

export type KbPickerOption = MultiSelectOption & SelectOption

type UseKbPickerOptions = {
  enabled?: boolean
  sortBy?: KbFeedParams["sortBy"]
  sortDir?: KbFeedParams["sortDir"]
}

function toOption(kb: Kb): KbPickerOption {
  return {
    label: kb.enabled ? kb.name : `${kb.name}（已停用）`,
    value: kb.id,
    disabled: !kb.enabled,
  }
}

export function useKbPicker(options: UseKbPickerOptions = {}) {
  const { enabled, sortBy = "createdAt", sortDir = "desc" } = options
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 250)

  const feedParams = useMemo(
    () => ({
      ...(debouncedSearch.trim() ? { q: debouncedSearch.trim() } : {}),
      ...(enabled !== undefined ? { enabled } : {}),
      sortBy,
      sortDir,
    }),
    [debouncedSearch, enabled, sortBy, sortDir],
  )

  const feed = useKbFeed(feedParams)

  const items = useMemo(
    () => feed.data?.pages.flatMap((page) => page.items) ?? [],
    [feed.data],
  )

  const optionsList = useMemo(() => items.map(toOption), [items])

  const total = feed.data?.pages[0]?.total ?? 0
  const hasMore = !!feed.hasNextPage

  function loadMore() {
    if (!hasMore || feed.isFetchingNextPage) return
    void feed.fetchNextPage()
  }

  return {
    search,
    setSearch,
    options: optionsList,
    items,
    total,
    hasMore,
    loadMore,
    isLoading: feed.isLoading,
    isError: feed.isError,
    isFetching: feed.isFetching && !feed.isFetchingNextPage,
    loadingMore: feed.isFetchingNextPage,
  }
}
