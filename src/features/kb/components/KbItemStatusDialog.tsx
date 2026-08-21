import { useEffect, useState } from "react"
import { getKbItemIngestion, type IngestionWarning, type KbItem } from "@/api/kb"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { LoadingText } from "@/components/ui/loading-text"
import { formatShanghaiDateTime } from "@/lib/dateTime"

type KbItemStatusDialogProps = {
  open: boolean
  kbId: string
  item: KbItem | null
  onOpenChange: (open: boolean) => void
  onRetryExtraction?: () => void
  onRetryIndexing?: () => void
  onContinueDraft?: () => void
  retrying?: boolean
}

type StatusDetails = {
  errorCode: string | null
  warnings: Array<{ pageNumber: number; errorCode?: string | null }>
  expiresAt: string | null
}

export function KbItemStatusDialog({
  open,
  kbId,
  item,
  onOpenChange,
  onRetryExtraction,
  onRetryIndexing,
  onContinueDraft,
  retrying = false,
}: KbItemStatusDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<StatusDetails | null>(null)

  useEffect(() => {
    if (!open || !item) return
    let cancelled = false
    const target = item
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const status = await getKbItemIngestion(kbId, target.id)
        if (cancelled) return
        setDetails({
          errorCode: status.errorCode ?? null,
          warnings: (status.warnings as IngestionWarning[] | undefined)?.map((warning) => ({
            pageNumber: warning.pageNumber,
            errorCode: warning.errorCode,
          })) ?? [],
          expiresAt: status.expiresAt ?? null,
        })
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载状态失败")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, item, kbId])

  const status = item?.status ?? ""
  const canRetryExtraction = status === "extraction_failed"
  const canRetryIndexing = status === "indexing_failed"
  const canContinueDraft = status === "draft"
  const shownDetails = open && item ? details : null
  const errorCode = shownDetails?.errorCode ?? null
  const warnings = shownDetails?.warnings ?? []
  const expiresAt = shownDetails?.expiresAt ?? null

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={item?.fileName ?? "文档状态"}
      description="查看处理状态与错误信息"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {canContinueDraft && onContinueDraft ? (
            <Button variant="primary" onClick={onContinueDraft}>
              继续确认分片
            </Button>
          ) : null}
          {canRetryExtraction && onRetryExtraction ? (
            <Button variant="primary" loading={retrying} onClick={onRetryExtraction}>
              重试抽取
            </Button>
          ) : null}
          {canRetryIndexing && onRetryIndexing ? (
            <Button variant="primary" loading={retrying} onClick={onRetryIndexing}>
              重试索引
            </Button>
          ) : null}
          <Button variant="dialog-cancel" onClick={() => onOpenChange(false)} disabled={retrying}>
            关闭
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="py-6 text-sm text-muted-foreground">
          <LoadingText>正在加载状态</LoadingText>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!loading && !error && item ? (
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-muted-foreground">当前状态</div>
            <div className="mt-1 font-medium">{statusLabel(status)}</div>
          </div>
          {errorCode ? (
            <div>
              <div className="text-muted-foreground">错误</div>
              <div className="mt-1 break-words text-destructive">{errorCode}</div>
            </div>
          ) : null}
          {warnings.length > 0 ? (
            <div>
              <div className="text-muted-foreground">页级警告</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-amber-800">
                {warnings.map((warning) => (
                  <li key={`${warning.pageNumber}-${warning.errorCode ?? "warn"}`}>
                    第 {warning.pageNumber} 页
                    {warning.errorCode ? `：${warning.errorCode}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {expiresAt ? (
            <div>
              <div className="text-muted-foreground">草稿到期</div>
              <div className="mt-1 tabular-nums">{formatShanghaiDateTime(expiresAt)}</div>
            </div>
          ) : null}
          {!errorCode && warnings.length === 0 && !canContinueDraft ? (
            <p className="text-muted-foreground">暂无额外错误信息。</p>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  )
}

function statusLabel(status: string) {
  return (
    (
      {
        extracting: "抽取中",
        draft: "待确认",
        indexing: "索引中",
        active: "可用",
        extraction_failed: "抽取失败",
        indexing_failed: "索引失败",
        disabled: "已禁用",
      } as Record<string, string>
    )[status] ?? status
  )
}
