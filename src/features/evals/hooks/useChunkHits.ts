import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { getSearchChunks, type SearchHit } from "@/api/search"
import { queryKeys } from "@/app/queryKeys"

/**
 * 按 ID 批量解析 chunk 元信息（文件名、编号、摘要），
 * 用于把评测结果里的 retrieved/relevant chunk ID 还原成可读名称，而非检索调用。
 */
export function useChunkHits(chunkIds: string[]) {
  const uniqueIds = Array.from(
    new Set(chunkIds.filter((id) => typeof id === "string" && id.length > 0)),
  )
  const key = [...uniqueIds].sort().join("|")
  const query = useQuery({
    queryKey: queryKeys.search.chunks(key),
    queryFn: () => getSearchChunks(uniqueIds),
    enabled: uniqueIds.length > 0,
  })
  const hitByChunkId = useMemo(() => {
    const map: Record<string, SearchHit> = {}
    for (const hit of query.data ?? []) map[hit.chunkId] = hit
    return map
  }, [query.data])
  return { ...query, hitByChunkId }
}
