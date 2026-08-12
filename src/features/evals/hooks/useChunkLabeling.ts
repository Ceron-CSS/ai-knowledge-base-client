import { useCallback, useState } from "react"
import { searchEntries, type SearchHit } from "@/api/search"
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

  const canSearch = kbId.trim().length > 0 && query.trim().length > 0 && !searching

  const onSearch = useCallback(async () => {
    if (!canSearch) return
    setSearching(true)
    setError(null)
    try {
      const parsedTopK = Number(topK)
      const result = await searchEntries({
        kbId,
        q: query.trim(),
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
  }, [canSearch, kbId, query, topK])

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
    kbId,
    setKbId,
    query,
    setQuery,
    topK,
    setTopK,
    hits,
    searched,
    searching,
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
