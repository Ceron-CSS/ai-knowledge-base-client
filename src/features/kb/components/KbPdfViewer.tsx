import { useEffect, useState } from "react"
import { fetchKbItemFileBytes } from "@/api/kb"
import { LoadingText } from "@/components/ui/loading-text"

type KbPdfViewerProps = {
  kbId: string
  itemId: string
  initialPage?: number
}

export function KbPdfViewer({ kbId, itemId, initialPage = 1 }: KbPdfViewerProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let url: string | null = null
    async function load() {
      setLoading(true)
      setError(null)
      setObjectUrl(null)
      try {
        const bytes = await fetchKbItemFileBytes(kbId, itemId)
        if (cancelled) return
        url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }))
        setObjectUrl(url)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "PDF 加载失败")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [kbId, itemId])

  if (loading) {
    return (
      <div className="flex h-full min-h-64 items-center justify-center text-sm text-muted-foreground">
        <LoadingText>正在加载原文 PDF</LoadingText>
      </div>
    )
  }
  if (error) {
    return <div className="p-4 text-sm text-destructive">{error}</div>
  }
  if (!objectUrl) return null

  const hash = initialPage > 1 ? `#page=${initialPage}` : ""

  return (
    <iframe
      title="PDF 原文预览"
      src={`${objectUrl}${hash}`}
      className="h-full min-h-64 w-full border-0 bg-muted/20"
    />
  )
}
