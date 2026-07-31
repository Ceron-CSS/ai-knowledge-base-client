import { useCallback, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { searchEntries, type SearchHit } from "@/api/search"
import { HttpError } from "@/api/http"
import { useKbList } from "@/features/kb"
import { openKbItemChunk } from "@/features/kb/lib/openKbItemChunk"
import type { SelectOption } from "@/components/ui/select"

const DEFAULT_TOP_K = 6

export function useRetrievalDebugPage() {
  const navigate = useNavigate()
  const kbList = useKbList({ pageSize: 100, sortBy: "createdAt", sortDir: "desc" })

  const [kbId, setKbId] = useState("")
  const [query, setQuery] = useState("")
  const [topK, setTopK] = useState(String(DEFAULT_TOP_K))
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openingKey, setOpeningKey] = useState<string | null>(null)

  const kbOptions = useMemo<SelectOption[]>(() => {
    const items = kbList.data?.items ?? []
    return items.map((kb) => ({
      label: kb.enabled ? kb.name : `${kb.name}（已停用）`,
      value: kb.id,
      disabled: !kb.enabled,
    }))
  }, [kbList.data?.items])

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
    } catch (e) {
      setHits([])
      setSearched(true)
      setError(e instanceof HttpError || e instanceof Error ? e.message : "召回失败")
    } finally {
      setSearching(false)
    }
  }, [canSearch, kbId, query, topK])

  const openHit = useCallback(
    async (hit: SearchHit) => {
      const key = `${hit.itemId}:${hit.chunkIndex}`
      setOpeningKey(key)
      setError(null)
      try {
        await openKbItemChunk(navigate, {
          kbId: hit.kbId,
          itemId: hit.itemId,
          chunkIndex: hit.chunkIndex,
        })
      } catch (e) {
        setError(e instanceof HttpError || e instanceof Error ? e.message : "打开文档失败")
      } finally {
        setOpeningKey(null)
      }
    },
    [navigate],
  )

  const resultLabel = useMemo(() => {
    if (!searched) return "输入查询后查看召回结果"
    if (error) return null
    return `共召回 ${hits.length} 个片段`
  }, [error, hits.length, searched])

  return {
    kbList,
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
    canSearch,
    error,
    openingKey,
    resultLabel,
    onSearch,
    openHit,
  }
}
