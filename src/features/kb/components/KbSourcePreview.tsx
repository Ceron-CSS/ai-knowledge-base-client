import { Suspense, lazy, useEffect, useState } from "react"
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

function OriginalTextFilePreview({
  kbId,
  itemId,
  kind,
}: {
  kbId: string
  itemId: string
  kind: "markdown" | "text"
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
    return (
      <div className="h-full overflow-y-auto p-4 text-sm text-destructive">{error}</div>
    )
  }
  if (!content.trim()) {
    return <div className="h-full p-3 text-sm text-muted-foreground">原文件为空</div>
  }
  if (kind === "markdown") {
    return (
      <div className="h-full overflow-y-auto p-4">
        <MarkdownMessage content={content} />
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
          <OriginalTextFilePreview kbId={kbId} itemId={itemId} kind={kind} />
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
        <pre className="h-full overflow-y-auto whitespace-pre-wrap break-words p-3 text-sm leading-6">
          {text.trim() ? text : "暂无预览内容"}
        </pre>
      ) : null}
    </div>
  )
}

