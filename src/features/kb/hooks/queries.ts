import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createKb,
  deleteKb,
  deleteKbItem,
  getKb,
  type KbItem,
  type KbItemWithKb,
  listAllKbItems,
  listKbItems,
  listKbs,
  retryKbItemExtraction,
  retryKbItemIndexing,
  setKbEnabled,
  setKbItemEnabled,
  updateKb,
  type KbItemListParams,
  type KbListParams,
  type PaginatedResult,
} from "@/api/kb"
import { MAX_PAGE_SIZE } from "@/api/listQuery"
import { showDeleteFailureToast } from "@/lib/deleteError"

const KB_FEED_PAGE_SIZE = 20

export type KbFeedParams = Omit<KbListParams, "page" | "pageSize"> & {
  pageSize?: number
}

const kbKeys = {
  all: ["kb"] as const,
  detail: (kbId: string) => ["kb", "detail", kbId] as const,
  list: (params: KbListParams) => ["kb", "list", params] as const,
  feed: (params: KbFeedParams) => ["kb", "feed", params] as const,
  items: (kbId: string, params: KbItemListParams) => ["kb", "items", kbId, params] as const,
  allItems: (params: KbItemListParams) => ["kb", "items", "all", params] as const,
}

const EMPTY_LIST_PARAMS: KbListParams = {}
const EMPTY_ITEM_PARAMS: KbItemListParams = {}

export function useKbList(params?: KbListParams) {
  const effectiveParams = params ?? EMPTY_LIST_PARAMS
  return useQuery({
    queryKey: kbKeys.list(effectiveParams),
    queryFn: () => listKbs(effectiveParams),
  })
}

export function useKb(kbId: string) {
  return useQuery({
    queryKey: kbKeys.detail(kbId),
    queryFn: () => getKb(kbId),
    enabled: !!kbId,
  })
}

export function useKbFeed(params: KbFeedParams = {}) {
  const { pageSize = KB_FEED_PAGE_SIZE, ...rest } = params
  const feedParams = { ...rest, pageSize: Math.min(pageSize, MAX_PAGE_SIZE) }
  return useInfiniteQuery({
    queryKey: kbKeys.feed(feedParams),
    queryFn: ({ pageParam }) =>
      listKbs({
        ...rest,
        page: pageParam,
        pageSize: feedParams.pageSize,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
  })
}

export function useCreateKb() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createKb,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: kbKeys.all })
    },
  })
}

export function useUpdateKb() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name: string; description?: string } }) =>
      updateKb(id, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: kbKeys.all })
    },
  })
}

export function useSetKbEnabled() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      enabled,
      acknowledgeLinked,
    }: {
      id: string
      enabled: boolean
      acknowledgeLinked?: boolean
    }) => setKbEnabled(id, enabled, { acknowledgeLinked }),
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: kbKeys.all })
      if (!vars.enabled) {
        await qc.invalidateQueries({ queryKey: ["assistants"] })
      }
    },
  })
}

export function useDeleteKb() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, acknowledgeLinked }: { id: string; acknowledgeLinked?: boolean }) =>
      deleteKb(id, { acknowledgeLinked }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: kbKeys.all })
      await qc.invalidateQueries({ queryKey: ["assistants"] })
    },
    onError: (error) => showDeleteFailureToast(error),
  })
}

export function useKbItems(kbId: string, params?: KbItemListParams) {
  const qc = useQueryClient()
  const effectiveParams = params ?? EMPTY_ITEM_PARAMS
  return useQuery({
    queryKey: kbKeys.items(kbId, effectiveParams),
    queryFn: () => listKbItems(kbId, effectiveParams),
    enabled: !!kbId,
    placeholderData: (previousData) =>
      previousData ?? findCachedKbItemsPage(qc, kbId, effectiveParams),
    refetchInterval: (query) => {
      const rows = query.state.data?.items ?? []
      const busy = rows.some(
        (item) => item.status === "extracting" || item.status === "indexing",
      )
      return busy ? 2500 : false
    },
  })
}

export function useAllKbItems(params?: KbItemListParams) {
  const qc = useQueryClient()
  const effectiveParams = params ?? EMPTY_ITEM_PARAMS
  return useQuery({
    queryKey: kbKeys.allItems(effectiveParams),
    queryFn: () => listAllKbItems(effectiveParams),
    placeholderData: (previousData) =>
      previousData ?? findCachedAllKbItemsPage(qc, effectiveParams),
    refetchInterval: (query) => {
      const rows = query.state.data?.items ?? []
      const busy = rows.some(
        (item) => item.status === "extracting" || item.status === "indexing",
      )
      return busy ? 2500 : false
    },
  })
}

function findCachedKbItemsPage(
  qc: ReturnType<typeof useQueryClient>,
  kbId: string,
  params: KbItemListParams,
) {
  const matches = qc.getQueriesData<PaginatedResult<KbItem>>({
    queryKey: ["kb", "items", kbId],
  })
  const found = matches.find(([key, data]) => {
    if (!data || !Array.isArray(key) || key.length < 4) return false
    const cachedParams = key[3] as KbItemListParams
    return (
      cachedParams.pageSize === params.pageSize &&
      (cachedParams.q ?? "") === (params.q ?? "") &&
      cachedParams.sortBy === params.sortBy &&
      cachedParams.sortDir === params.sortDir
    )
  })
  return found?.[1]
}

function findCachedAllKbItemsPage(
  qc: ReturnType<typeof useQueryClient>,
  params: KbItemListParams,
) {
  const matches = qc.getQueriesData<PaginatedResult<KbItemWithKb>>({
    queryKey: ["kb", "items", "all"],
  })
  const found = matches.find(([key, data]) => {
    if (!data || !Array.isArray(key) || key.length < 4) return false
    const cachedParams = key[3] as KbItemListParams
    return (
      cachedParams.pageSize === params.pageSize &&
      (cachedParams.q ?? "") === (params.q ?? "") &&
      cachedParams.sortBy === params.sortBy &&
      cachedParams.sortDir === params.sortDir
    )
  })
  return found?.[1]
}

export function useRetryKbItemExtraction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ kbId, itemId }: { kbId: string; itemId: string }) =>
      retryKbItemExtraction(kbId, itemId),
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ["kb", "items", vars.kbId] })
      await qc.invalidateQueries({ queryKey: ["kb", "items", "all"] })
    },
  })
}

export function useRetryKbItemIndexing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ kbId, itemId }: { kbId: string; itemId: string }) =>
      retryKbItemIndexing(kbId, itemId),
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ["kb", "items", vars.kbId] })
      await qc.invalidateQueries({ queryKey: ["kb", "items", "all"] })
    },
  })
}

export function useSetKbItemEnabled() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ kbId, itemId, enabled }: { kbId: string; itemId: string; enabled: boolean }) =>
      setKbItemEnabled(kbId, itemId, enabled),
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ["kb", "items", vars.kbId] })
      await qc.invalidateQueries({ queryKey: ["kb", "items", "all"] })
    },
  })
}

export function useDeleteKbItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ kbId, itemId }: { kbId: string; itemId: string }) => deleteKbItem(kbId, itemId),
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: ["kb", "items", vars.kbId] })
      await qc.invalidateQueries({ queryKey: ["kb", "items", "all"] })
      await qc.invalidateQueries({ queryKey: kbKeys.all })
    },
    onError: (error) => showDeleteFailureToast(error),
  })
}
