import type { SearchHit } from "@/api/search"

type ChunkRefListProps = {
  chunkIds: string[]
  hitByChunkId: Record<string, SearchHit>
  loading?: boolean
}

function hitTooltip(hit: SearchHit) {
  const snippet = hit.snippet.length > 180 ? `${hit.snippet.slice(0, 180)}…` : hit.snippet
  return `${hit.chunkId} · ${snippet}`
}

/** 把 chunk ID 列表还原为“文件名 #编号”；未解析到时回退显示原始 ID。 */
export function ChunkRefList({ chunkIds, hitByChunkId, loading }: ChunkRefListProps) {
  if (chunkIds.length === 0) {
    return <div className="text-sm text-muted-foreground">-</div>
  }
  return (
    <ol className="space-y-1.5">
      {chunkIds.map((chunkId, index) => {
        const hit = hitByChunkId[chunkId]
        return (
          <li
            key={`${index}-${chunkId}`}
            className="flex items-baseline justify-between gap-2 rounded-md bg-muted/30 px-2 py-1 text-sm"
            title={hit ? hitTooltip(hit) : chunkId}
          >
            <span className="min-w-0 flex-1">
              <span className="mr-1.5 shrink-0 tabular-nums text-muted-foreground">
                {index + 1}.
              </span>
              {hit ? (
                <>
                  {hit.fileName}{" "}
                  <span className="text-muted-foreground">#{hit.chunkIndex + 1}</span>
                </>
              ) : loading ? (
                <span className="text-muted-foreground">加载中…</span>
              ) : (
                chunkId
              )}
            </span>
            {hit ? (
              <span className="shrink-0 text-xs text-muted-foreground/70">{chunkId}</span>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
