import { ExternalLink } from "lucide-react"
import { dedupeCitationsByItem } from "@/features/assistantChat/lib/parseMessageContent"
import { openKbItemChunkInNewTab } from "@/features/kb/lib/openKbItemChunk"
import type { ParsedCitation } from "@/features/assistantChat/types"

type MessageCitationsProps = {
  citations: ParsedCitation[]
}

export function openCitationInNewTab(citation: ParsedCitation) {
  openKbItemChunkInNewTab({
    kbId: citation.kbId,
    itemId: citation.itemId,
    chunkIndex: citation.chunkIndex,
    pageStart: citation.pageStart,
  })
}

export function MessageCitations({ citations }: MessageCitationsProps) {
  const unique = dedupeCitationsByItem(citations)
  if (unique.length === 0) return null

  return (
    <div className="mt-3 border-t border-border/50 pt-2">
      <div className="mb-1.5 text-xs text-muted-foreground">引用来源</div>
      <ol className="space-y-1">
        {unique.map((citation, index) => (
          <li key={`${citation.itemId}-${citation.chunkIndex ?? index}-${index}`}>
            <button
              type="button"
              className="group flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-background/80"
              onClick={() => openCitationInNewTab(citation)}
              title="在新标签页打开原文"
            >
              <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/35 bg-background px-1 text-[11px] tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-1 text-xs font-medium text-foreground">
                <span className="truncate">{citation.fileName}</span>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-70" />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
