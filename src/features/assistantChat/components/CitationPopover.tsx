import { MarkdownMessage } from "@/components/ui/markdown-message"
import type { ActiveCitation } from "@/features/assistantChat/types"

type CitationPopoverProps = {
  activeCitation: ActiveCitation | null
  onClose: () => void
}

export function CitationPopover({ activeCitation, onClose }: CitationPopoverProps) {
  if (!activeCitation) return null

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="absolute w-[min(520px,calc(100vw-24px))] overflow-hidden rounded-lg border bg-popover text-sm text-popover-foreground shadow-xl"
        style={{ left: activeCitation.left, top: activeCitation.top }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b bg-muted/30 px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">参考片段 [{activeCitation.index + 1}]</div>
            <div className="mt-0.5 truncate text-sm font-medium" title={activeCitation.citation.fileName}>
              {activeCitation.citation.fileName}
            </div>
          </div>
        </div>
        <div className="max-h-[420px] overflow-auto bg-background/70 px-4 py-3">
          <MarkdownMessage content={activeCitation.citation.snippet} />
        </div>
        <div className="border-t bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
          相关度 {activeCitation.citation.score.toFixed(3)}
        </div>
      </div>
    </div>
  )
}
