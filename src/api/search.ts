import { requestJson } from "@/api/http"

export type SearchHit = {
  kbId: string
  itemId: string
  chunkId: string
  chunkIndex: number
  fileName: string
  snippet: string
  score: number
  retrievalSource: string
}

export type SearchParams = {
  kbId: string
  q: string
  topK?: number
}

/** 对指定知识库执行混合召回，返回排序后的分片命中。 */
export function searchEntries(params: SearchParams) {
  return requestJson<SearchHit[]>("/search", {
    query: {
      kbId: params.kbId,
      q: params.q,
      topK: params.topK,
    },
  })
}
