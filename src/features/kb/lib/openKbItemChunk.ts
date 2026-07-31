import { getKbItemDetail } from "@/api/kb"
import type { NavigateFunction } from "react-router-dom"

type OpenKbItemChunkParams = {
  kbId: string
  itemId: string
  chunkIndex?: number
}

/** 打开知识库文档分段预览，可选高亮指定分片（0-based）。 */
export async function openKbItemChunk(navigate: NavigateFunction, params: OpenKbItemChunkParams) {
  const detail = await getKbItemDetail(params.kbId, params.itemId)
  navigate(`/kb/${params.kbId}/upload`, {
    state: {
      itemId: params.itemId,
      fileName: detail.fileName,
      text: detail.content,
      chunks: detail.chunks,
      chunkConfig: detail.chunkConfig,
      ...(typeof params.chunkIndex === "number" ? { highlightChunkIndex: params.chunkIndex } : {}),
    },
  })
  return detail
}
