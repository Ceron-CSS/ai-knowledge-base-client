import type { NavigateFunction } from "react-router-dom"

type OpenKbItemChunkParams = {
  kbId: string
  itemId: string
  chunkIndex?: number
  chunkId?: string
  pageStart?: number
}

/** 打开文档详情：可定位原文页或高亮分片。 */
export function openKbItemChunk(navigate: NavigateFunction, params: OpenKbItemChunkParams) {
  const search = new URLSearchParams()
  const hasPage = typeof params.pageStart === "number" && params.pageStart > 0
  search.set("tab", hasPage ? "source" : "chunks")
  if (hasPage) search.set("page", String(Math.floor(params.pageStart!)))
  if (typeof params.chunkIndex === "number" && Number.isFinite(params.chunkIndex)) {
    search.set("chunkIndex", String(Math.max(0, Math.floor(params.chunkIndex))))
  }
  if (params.chunkId) search.set("chunk", params.chunkId)

  navigate(`/kb/${params.kbId}/items/${params.itemId}?${search.toString()}`)
}
