import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react"
import { fetchKbItemFileBytes } from "@/api/kb"
import { LoadingText } from "@/components/ui/loading-text"
import { MarkdownMessage } from "@/components/ui/markdown-message"
import { KbPdfViewer } from "@/features/kb/components/KbPdfViewer"

const KbDocxViewer = lazy(() =>
  import("@/features/kb/components/KbDocxViewer").then((m) => ({ default: m.KbDocxViewer })),
)

type KbSourcePreviewProps = {
  kbId: string
  itemId?: string | null
  fileName: string
  text: string
  textEditable?: boolean
  onTextChange?: (value: string) => void
  initialPage?: number
  /** 召回分片原文，用于在 Markdown/TXT 原文中定位高亮 */
  highlightText?: string | null
}

type PreviewKind = "pdf" | "markdown" | "text" | "docx" | "unknown"

function getPreviewKind(fileName: string): PreviewKind {
  const lower = fileName.toLowerCase()
  if (lower.endsWith(".pdf")) return "pdf"
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) return "markdown"
  if (lower.endsWith(".txt")) return "text"
  if (lower.endsWith(".docx")) return "docx"
  return "unknown"
}

function decodeTextFile(bytes: ArrayBuffer) {
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes)
  return decoded.replace(/^\uFEFF/, "")
}

function findHighlightRange(content: string, highlightText: string) {
  const needle = highlightText.trim()
  if (!needle) return null
  const direct = content.indexOf(needle)
  if (direct >= 0) return { start: direct, end: direct + needle.length }

  // 宽松匹配：压缩空白后再找，再映射回原文区间
  const compact = (value: string) => value.replace(/\s+/g, "")
  const compactContent = compact(content)
  const compactNeedle = compact(needle)
  if (!compactNeedle) return null
  const compactIndex = compactContent.indexOf(compactNeedle)
  if (compactIndex < 0) return null

  let seen = 0
  let start = -1
  let end = -1
  for (let i = 0; i < content.length; i += 1) {
    if (/\s/.test(content[i]!)) continue
    if (seen === compactIndex) start = i
    seen += 1
    if (seen === compactIndex + compactNeedle.length) {
      end = i + 1
      break
    }
  }
  if (start < 0 || end < 0) return null
  return { start, end }
}

function HighlightedPlainText({ content, highlightText }: { content: string; highlightText: string }) {
  const hitRef = useRef<HTMLElement | null>(null)
  const range = useMemo(() => findHighlightRange(content, highlightText), [content, highlightText])

  useEffect(() => {
    hitRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [content, highlightText, range?.start])

  if (!range) {
    return (
      <pre className="h-full overflow-y-auto whitespace-pre-wrap break-words p-3 text-sm leading-6">{content}</pre>
    )
  }

  return (
    <pre className="h-full overflow-y-auto whitespace-pre-wrap break-words p-3 text-sm leading-6">
      {content.slice(0, range.start)}
      <mark
        ref={hitRef}
        className="rounded-sm bg-amber-200/80 px-0.5 text-foreground ring-1 ring-amber-400/50"
      >
        {content.slice(range.start, range.end)}
      </mark>
      {content.slice(range.end)}
    </pre>
  )
}

function MarkdownSourcePreview({
  content,
  highlightText,
}: {
  content: string
  highlightText?: string | null
}) {
  const hitRef = useRef<HTMLDivElement | null>(null)
  const range = useMemo(
    () => (highlightText?.trim() ? findHighlightRange(content, highlightText) : null),
    [content, highlightText],
  )

  useEffect(() => {
    if (!range) return
    hitRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [content, range])

  if (!range) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <MarkdownMessage content={content} />
      </div>
    )
  }

  const before = content.slice(0, range.start)
  const matched = content.slice(range.start, range.end)
  const after = content.slice(range.end)

  return (
    <div className="h-full overflow-y-auto p-4">
      {before.trim() ? <MarkdownMessage content={before} /> : null}
      <div
        ref={hitRef}
        className="my-3 rounded-md border border-amber-300 bg-amber-50/80 p-3 text-foreground ring-1 ring-amber-400/40 dark:border-amber-500/40 dark:bg-amber-500/10"
      >
        <MarkdownMessage content={matched} />
      </div>
      {after.trim() ? <MarkdownMessage content={after} /> : null}
    </div>
  )
}

function OriginalTextFilePreview({
  kbId,
  itemId,
  kind,
  highlightText,
}: {
  kbId: string
  itemId: string
  kind: "markdown" | "text"
  highlightText?: string | null
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState("")

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const bytes = await fetchKbItemFileBytes(kbId, itemId)
        if (cancelled) return
        setContent(decodeTextFile(bytes))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "原文件加载失败")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [kbId, itemId])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <LoadingText>正在加载原文件</LoadingText>
      </div>
    )
  }
  if (error) {
    return <div className="h-full overflow-y-auto p-4 text-sm text-destructive">{error}</div>
  }
  if (!content.trim()) {
    return <div className="h-full p-3 text-sm text-muted-foreground">原文件为空</div>
  }

  if (kind === "markdown") {
    return <MarkdownSourcePreview content={content} highlightText={highlightText} />
  }

  if (highlightText?.trim()) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
          已在原文中高亮召回片段
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <HighlightedPlainText content={content} highlightText={highlightText} />
        </div>
      </div>
    )
  }

  return (
    <pre className="h-full overflow-y-auto whitespace-pre-wrap break-words p-3 text-sm leading-6">
      {content}
    </pre>
  )
}

export function KbSourcePreview({
  kbId,
  itemId,
  fileName,
  text,
  textEditable = false,
  onTextChange,
  initialPage = 1,
  highlightText = null,
}: KbSourcePreviewProps) {
  const kind = getPreviewKind(fileName)
  const hasOriginalFile = Boolean(itemId)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {hasOriginalFile && itemId && kind === "pdf" ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <KbPdfViewer kbId={kbId} itemId={itemId} initialPage={initialPage} />
        </div>
      ) : null}

      {hasOriginalFile && itemId && (kind === "markdown" || kind === "text") ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <OriginalTextFilePreview
            kbId={kbId}
            itemId={itemId}
            kind={kind}
            highlightText={highlightText}
          />
        </div>
      ) : null}

      {hasOriginalFile && itemId && kind === "docx" ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <LoadingText>正在加载原文 Word</LoadingText>
              </div>
            }
          >
            <KbDocxViewer key={`${kbId}-${itemId}`} kbId={kbId} itemId={itemId} />
          </Suspense>
        </div>
      ) : null}

      {hasOriginalFile && kind === "unknown" ? (
        <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
          当前文件类型暂不支持原文件预览
        </div>
      ) : null}

      {!hasOriginalFile && textEditable ? (
        <textarea
          value={text}
          onChange={(event) => onTextChange?.(event.target.value)}
          placeholder="粘贴或编辑文档内容…"
          className="h-full min-h-72 w-full resize-none border-0 bg-transparent p-3 text-sm outline-none"
        />
      ) : null}

      {!hasOriginalFile && !textEditable ? (
        kind === "markdown" ? (
          <MarkdownSourcePreview
            content={text.trim() ? text : "暂无预览内容"}
            highlightText={highlightText}
          />
        ) : highlightText?.trim() ? (
          <HighlightedPlainText content={text} highlightText={highlightText} />
        ) : (
          <pre className="h-full overflow-y-auto whitespace-pre-wrap break-words p-3 text-sm leading-6">
            {text.trim() ? text : "暂无预览内容"}
          </pre>
        )
      ) : null}
    </div>
  )
}
