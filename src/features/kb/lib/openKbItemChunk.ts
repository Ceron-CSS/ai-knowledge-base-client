import type { NavigateFunction } from "react-router-dom"

type OpenKbItemChunkParams = {
  kbId: string
  itemId: string
  chunkIndex?: number
  chunkId?: string
  pageStart?: number
  /**
   * 默认 true：优先打开原文预览。
   * Markdown/TXT 可按分片文本定位；PDF 有页码时跳页；无法定位的 PDF 由详情页回退分片视图。
   */
  preferSource?: boolean
}

export function buildKbItemChunkPath(params: OpenKbItemChunkParams) {
  const search = new URLSearchParams()
  const hasPage = typeof params.pageStart === "number" && params.pageStart > 0
  const preferSource = params.preferSource !== false
  search.set("tab", hasPage || preferSource ? "source" : "chunks")
  if (hasPage) search.set("page", String(Math.floor(params.pageStart!)))
  if (typeof params.chunkIndex === "number" && Number.isFinite(params.chunkIndex)) {
    search.set("chunkIndex", String(Math.max(0, Math.floor(params.chunkIndex))))
  }
  if (params.chunkId) search.set("chunk", params.chunkId)

  return `/item/${params.kbId}/${params.itemId}?${search.toString()}`
}

/** 当前页打开文档详情：可定位原文页或高亮分片。 */
export function openKbItemChunk(navigate: NavigateFunction, params: OpenKbItemChunkParams) {
  navigate(buildKbItemChunkPath(params))
}

/** 新标签页打开文档详情并定位到对应分片/页。 */
export function openKbItemChunkInNewTab(params: OpenKbItemChunkParams) {
  window.open(buildKbItemChunkPath(params), "_blank", "noopener,noreferrer")
}
