import { Copy, ExternalLink, FileText, ThumbsDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarkdownMessageLazy } from "@/components/ui/markdown-message-lazy"
import type { ActiveCitation } from "@/features/assistantChat/types"

type CitationPopoverProps = {
  activeCitation: ActiveCitation | null
  onClose: () => void
  openingSource?: boolean
  loadingFullChunk?: boolean
  showingFullChunk?: boolean
  fullChunkText?: string | null
  feedbackPending?: boolean
  feedbackSubmitted?: boolean
  onOpenSource?: () => void
  onViewFullChunk?: () => void
  onCopy?: () => void
  onFeedbackIrrelevant?: () => void
}

export function CitationPopover({
  activeCitation,
  onClose,
  openingSource = false,
  loadingFullChunk = false,
  showingFullChunk = false,
  fullChunkText = null,
  feedbackPending = false,
  feedbackSubmitted = false,
  onOpenSource,
  onViewFullChunk,
  onCopy,
  onFeedbackIrrelevant,
}: CitationPopoverProps) {
  if (!activeCitation) return null

  const bodyContent = showingFullChunk && fullChunkText ? fullChunkText : activeCitation.citation.snippet

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="absolute w-[min(520px,calc(100vw-24px))] overflow-hidden rounded-lg border bg-popover text-sm text-popover-foreground shadow-xl"
        style={{ left: activeCitation.left, top: activeCitation.top }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b bg-muted/30 px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">
              参考片段 [{activeCitation.index + 1}]
              {showingFullChunk ? <span className="ml-2 text-primary">完整分片</span> : null}
            </div>
            <div className="mt-0.5 truncate text-sm font-medium" title={activeCitation.citation.fileName}>
              {activeCitation.citation.fileName}
            </div>
          </div>
        </div>
        <div className="max-h-[360px] overflow-auto bg-background/70 px-4 py-3">
          <MarkdownMessageLazy content={bodyContent} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-3 py-2">
          <div className="text-[11px] text-muted-foreground">
            相关度 {activeCitation.citation.score.toFixed(3)}
            {typeof activeCitation.citation.chunkIndex === "number" ? (
              <span className="ml-2">分片 #{activeCitation.citation.chunkIndex + 1}</span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onOpenSource?.()}
              disabled={openingSource}
              loading={openingSource}
              title="打开原文位置"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              打开原文
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onViewFullChunk?.()}
              disabled={loadingFullChunk}
              loading={loadingFullChunk}
              title={showingFullChunk ? "收起完整分片" : "查看完整分片"}
            >
              <FileText className="h-3.5 w-3.5" />
              {showingFullChunk ? "收起分片" : "完整分片"}
            </Button>
            <Button variant="ghost" size="xs" onClick={() => onCopy?.()} title="复制引用">
              <Copy className="h-3.5 w-3.5" />
              复制
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onFeedbackIrrelevant?.()}
              disabled={feedbackPending || feedbackSubmitted}
              loading={feedbackPending}
              title="反馈引用无关"
              className={feedbackSubmitted ? "text-muted-foreground" : undefined}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
              {feedbackSubmitted ? "已反馈" : "引用无关"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
