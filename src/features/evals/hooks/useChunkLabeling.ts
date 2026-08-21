import { useCallback, useEffect, useMemo, useState } from "react"
import { getSearchChunks, searchEntries, type SearchHit } from "@/api/search"
import { HttpError } from "@/api/http"
import { useKbPicker } from "@/features/kb"
import { openKbItemChunkInNewTab } from "@/features/kb/lib/openKbItemChunk"

const DEFAULT_TOP_K = 8

export function useChunkLabeling(initialSelected: string[] = [], initialQuery = "") {
  const kbPicker = useKbPicker()
  const [kbId, setKbId] = useState("")
  const [query, setQuery] = useState(initialQuery)
  const [topK, setTopK] = useState(String(DEFAULT_TOP_K))
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelected)
  const [hitByChunkId, setHitByChunkId] = useState<Record<string, SearchHit>>({})
  const [loadingSelected, setLoadingSelected] = useState(false)

  const canSearch = kbId.trim().length > 0 && query.trim().length > 0 && !searching
  const selectedKbOptions = useMemo(() => {
    const byKbId = new Map<string, { value: string; label: string }>()
    for (const hit of Object.values(hitByChunkId)) {
      if (!selectedIds.includes(hit.chunkId) || byKbId.has(hit.kbId)) continue
      byKbId.set(hit.kbId, {
        value: hit.kbId,
        label: hit.kbName || hit.kbId,
      })
    }
    return Array.from(byKbId.values())
  }, [hitByChunkId, selectedIds])
  const kbOptions = useMemo(() => {
    const existing = new Set(kbPicker.options.map((option) => option.value))
    return [
      ...selectedKbOptions.filter((option) => !existing.has(option.value)),
      ...kbPicker.options,
    ]
  }, [kbPicker.options, selectedKbOptions])

  useEffect(() => {
    const missingIds = selectedIds.filter((id) => !hitByChunkId[id])
    if (!missingIds.length) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingSelected(true)
    getSearchChunks(missingIds)
      .then((result) => {
        if (cancelled) return
        setHitByChunkId((prev) => {
          const next = { ...prev }
          for (const hit of result) next[hit.chunkId] = hit
          return next
        })
        const firstKbId = result[0]?.kbId
        if (firstKbId) setKbId((current) => current || firstKbId)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof HttpError || e instanceof Error ? e.message : "已选 Chunk 加载失败")
      })
      .finally(() => {
        if (!cancelled) setLoadingSelected(false)
      })
    return () => {
      cancelled = true
    }
  }, [hitByChunkId, selectedIds])

  const onSearch = useCallback(async (queryOverride?: string) => {
    const searchQuery = (queryOverride ?? query).trim()
    if (kbId.trim().length === 0 || searchQuery.length === 0 || searching) return
    setSearching(true)
    setError(null)
    setQuery(searchQuery)
    try {
      const parsedTopK = Number(topK)
      const result = await searchEntries({
        kbId,
        q: searchQuery,
        topK: Number.isFinite(parsedTopK) ? parsedTopK : DEFAULT_TOP_K,
      })
      setHits(result)
      setSearched(true)
      setHitByChunkId((prev) => {
        const next = { ...prev }
        for (const hit of result) next[hit.chunkId] = hit
        return next
      })
    } catch (e) {
      setHits([])
      setSearched(true)
      setError(e instanceof HttpError || e instanceof Error ? e.message : "召回失败")
    } finally {
      setSearching(false)
    }
  }, [kbId, query, searching, topK])

  const toggleChunk = useCallback((chunkId: string) => {
    setSelectedIds((prev) =>
      prev.includes(chunkId) ? prev.filter((id) => id !== chunkId) : [...prev, chunkId],
    )
  }, [])

  const removeChunk = useCallback((chunkId: string) => {
    setSelectedIds((prev) => prev.filter((id) => id !== chunkId))
  }, [])

  const openHit = useCallback((hit: SearchHit) => {
    openKbItemChunkInNewTab({
      kbId: hit.kbId,
      itemId: hit.itemId,
      chunkIndex: hit.chunkIndex,
      chunkId: hit.chunkId,
      pageStart: hit.pageStart ?? undefined,
    })
  }, [])

  const resetFrom = useCallback((ids: string[], nextQuery = "") => {
    setSelectedIds(ids)
    setQuery(nextQuery)
    setHits([])
    setSearched(false)
    setError(null)
  }, [])

  return {
    kbPicker,
    kbOptions,
    kbId,
    setKbId,
    query,
    setQuery,
    topK,
    setTopK,
    hits,
    searched,
    searching,
    loadingSelected,
    canSearch,
    error,
    selectedIds,
    hitByChunkId,
    onSearch,
    toggleChunk,
    removeChunk,
    openHit,
    resetFrom,
  }
}
