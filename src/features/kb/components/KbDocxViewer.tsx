import { useEffect, useRef, useState } from "react"
import { Minus, Plus, RotateCcw } from "lucide-react"
import { fetchKbItemFileBytes } from "@/api/kb"
import { Button } from "@/components/ui/button"
import { LoadingText } from "@/components/ui/loading-text"

type KbDocxViewerProps = {
  kbId: string
  itemId: string
}

const ZOOM_MIN = 1
const ZOOM_MAX = 2
const ZOOM_STEP = 0.1
const ZOOM_DEFAULT = 1

function formatZoom(zoom: number) {
  return `${Math.round(zoom * 100)}%`
}

function clampZoom(zoom: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(zoom * 10) / 10))
}

export function KbDocxViewer({ kbId, itemId }: KbDocxViewerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(ZOOM_DEFAULT)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    function onWheel(event: WheelEvent) {
      if (!(event.ctrlKey || event.metaKey)) return
      event.preventDefault()
      const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      setZoom((z) => clampZoom(z + delta))
    }

    root.addEventListener("wheel", onWheel, { passive: false })
    return () => root.removeEventListener("wheel", onWheel)
  }, [])

  useEffect(() => {
    let cancelled = false
    const container = containerRef.current
    async function load() {
      setLoading(true)
      setError(null)
      if (!container) {
        setLoading(false)
        setError("预览容器未就绪")
        return
      }
      container.innerHTML = ""
      try {
        const [{ renderAsync }, bytes] = await Promise.all([
          import("docx-preview"),
          fetchKbItemFileBytes(kbId, itemId),
        ])
        if (cancelled) return
        await renderAsync(bytes, container, undefined, {
          className: "kb-docx",
          inWrapper: true,
          breakPages: true,
          ignoreWidth: false,
          ignoreHeight: false,
        })
        if (cancelled) {
          container.innerHTML = ""
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Word 文档加载失败")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
      if (container) container.innerHTML = ""
    }
  }, [kbId, itemId])

  return (
    <div
      ref={rootRef}
      className="relative flex h-full min-h-64 flex-col overflow-hidden bg-muted/20"
      title="按住 Ctrl（Mac 为 ⌘）并滚动鼠标滚轮可缩放"
    >
      <div className="flex shrink-0 items-center justify-end gap-1 border-b bg-background/80 px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={loading || !!error || zoom <= ZOOM_MIN}
          aria-label="缩小"
          onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
        >
          <Minus />
        </Button>
        <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground">
          {formatZoom(zoom)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={loading || !!error || zoom >= ZOOM_MAX}
          aria-label="放大"
          onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
        >
          <Plus />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={loading || !!error || zoom === ZOOM_DEFAULT}
          aria-label="重置缩放"
          onClick={() => setZoom(ZOOM_DEFAULT)}
        >
          <RotateCcw />
        </Button>
      </div>

      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground">
          <LoadingText>正在加载原文 Word</LoadingText>
        </div>
      ) : null}
      {error ? <div className="p-4 text-sm text-destructive">{error}</div> : null}
      <div className="min-h-0 flex-1 overflow-auto">
        <div
          ref={containerRef}
          className="kb-docx-viewer origin-top p-3 [&_.kb-docx-wrapper]:mx-auto [&_.kb-docx]:bg-background [&_.kb-docx]:shadow-sm"
          style={{ zoom }}
        />
      </div>
    </div>
  )
}
