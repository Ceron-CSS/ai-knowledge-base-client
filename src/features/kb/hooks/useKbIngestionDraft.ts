import { useCallback, useEffect, useState } from "react"

import {
  getKbItemDetail,
  getKbItemIngestion,
  listKbItemPages,
  retryKbItemExtraction,
  type KbItemPage,
} from "@/api/kb"

export type ReadyDraft = {
  content: string
  pages: KbItemPage[]
  pageRevision: string | null
}

export function useKbIngestionDraft({
  enabled,
  kbId,
  itemId,
  onReady,
}: {
  enabled: boolean
  kbId: string
  itemId: string | null
  onReady: (draft: ReadyDraft) => void
}) {
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<
    Array<{ pageNumber: number; errorCode?: string | null; extractionMethod: string }>
  >([])
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [readyDraft, setReadyDraft] = useState<ReadyDraft | null>(null)
  const [pollRevision, setPollRevision] = useState(0)

  useEffect(() => {
    if (!enabled || !itemId) return
    let cancelled = false
    let timer: number | undefined

    async function poll() {
      try {
        const ingestion = await getKbItemIngestion(kbId, itemId!)
        if (cancelled) return
        setStatus(ingestion.status)
        setError(ingestion.errorCode ?? null)
        setWarnings(ingestion.warnings ?? [])
        setExpiresAt(ingestion.expiresAt ?? null)

        if (["draft", "active", "indexing", "indexing_failed"].includes(ingestion.status)) {
          const [detail, pages] = await Promise.all([
            getKbItemDetail(kbId, itemId!),
            listKbItemPages(kbId, itemId!),
          ])
          if (!cancelled) {
            const draft = {
              content: detail.content,
              pages,
              pageRevision: ingestion.pageRevision ?? null,
            }
            setReadyDraft(draft)
            onReady(draft)
          }
          return
        }

        if (ingestion.status === "extraction_failed") return
        if (ingestion.status !== "extracting") setStatus("extracting")
        timer = window.setTimeout(() => void poll(), 1500)
      } catch (reason) {
        if (cancelled) return
        setError(reason instanceof Error ? reason.message : "抽取状态查询失败")
        timer = window.setTimeout(() => void poll(), 2500)
      }
    }

    void poll()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [enabled, itemId, kbId, onReady, pollRevision])

  const retry = useCallback(async () => {
    if (!itemId) return
    setError(null)
    setStatus("extracting")
    setReadyDraft(null)
    try {
      await retryKbItemExtraction(kbId, itemId)
      setPollRevision((revision) => revision + 1)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "重试失败")
    }
  }, [itemId, kbId])

  return { status, error, warnings, expiresAt, readyDraft, retry }
}
