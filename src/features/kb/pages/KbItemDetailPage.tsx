import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { getKbItemDetail, type KbItemChunkRecord, type KbItemDetail } from "@/api/kb"
import { Button } from "@/components/ui/button"
import { LoadingText } from "@/components/ui/loading-text"
import { Page, PageBody, PageHeader } from "@/components/ui/page-header"
import { KbSourcePreview } from "@/features/kb/components/KbSourcePreview"
import { formatCharCountK } from "@/features/kb/lib/formatCharCountK"

type DetailTab = "source" | "chunks"

export function KbItemDetailPage() {
  const { id: kbId = "", itemId = "" } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<KbItemDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const highlightRef = useRef<HTMLElement | null>(null)

  const tab = (searchParams.get("tab") === "chunks" ? "chunks" : "source") as DetailTab
  const page = Number(searchParams.get("page") || "1")
  const chunkIndexParam = searchParams.get("chunkIndex")
  const chunkIdParam = searchParams.get("chunk")
  const highlightChunkIndex =
    chunkIndexParam != null && Number.isFinite(Number(chunkIndexParam))
      ? Math.max(0, Math.floor(Number(chunkIndexParam)))
      : null

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!kbId || !itemId) return
      setLoading(true)
      setError(null)
      try {
        const next = await getKbItemDetail(kbId, itemId)
        if (!cancelled) setDetail(next)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载文档失败")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [kbId, itemId])

  const chunkRecords: KbItemChunkRecord[] = useMemo(() => {
    if (!detail) return []
    if (detail.chunkRecords?.length) return detail.chunkRecords
    return detail.chunks.map((text, index) => ({
      index,
      text,
      chunkId: `${detail.id}:${index}`,
    }))
  }, [detail])

  const activeChunkIndex = useMemo(() => {
    if (highlightChunkIndex != null) return highlightChunkIndex
    if (!chunkIdParam) return null
    const found = chunkRecords.findIndex((chunk) => chunk.chunkId === chunkIdParam)
    return found >= 0 ? found : null
  }, [chunkIdParam, chunkRecords, highlightChunkIndex])

  const activeChunk = useMemo(() => {
    if (activeChunkIndex == null) return null
    return chunkRecords.find((chunk) => chunk.index === activeChunkIndex) ?? null
  }, [activeChunkIndex, chunkRecords])

  const sourceInitialPage = useMemo(() => {
    if (Number.isFinite(page) && page > 0 && searchParams.has("page")) return Math.floor(page)
    const chunkPage = activeChunk?.pageStart
    if (typeof chunkPage === "number" && chunkPage > 0) return Math.floor(chunkPage)
    return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  }, [activeChunk?.pageStart, page, searchParams])

  useEffect(() => {
    if (tab !== "chunks" || activeChunkIndex == null) return
    highlightRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [tab, activeChunkIndex, chunkRecords.length])

  // PDF 无页码时无法在原文定位，回退到分片视图高亮
  useEffect(() => {
    if (!detail || tab !== "source" || activeChunkIndex == null) return
    const lower = detail.fileName.toLowerCase()
    if (!lower.endsWith(".pdf")) return
    const urlHasPage = searchParams.has("page") && Number.isFinite(page) && page > 0
    const chunkPage = activeChunk?.pageStart
    const hasChunkPage = typeof chunkPage === "number" && chunkPage > 0
    if (urlHasPage) return
    if (hasChunkPage) {
      const params = new URLSearchParams(searchParams)
      params.set("page", String(Math.floor(chunkPage)))
      setSearchParams(params, { replace: true })
      return
    }
    const params = new URLSearchParams(searchParams)
    params.set("tab", "chunks")
    setSearchParams(params, { replace: true })
  }, [activeChunk?.pageStart, activeChunkIndex, detail, page, searchParams, setSearchParams, tab])

  function setTab(next: DetailTab) {
    const params = new URLSearchParams(searchParams)
    params.set("tab", next)
    setSearchParams(params, { replace: true })
  }

  return (
    <Page fill>
      <PageHeader
        items={[
          { label: "知识库", href: "/kb" },
          { label: "文档列表", href: `/kb/${kbId}` },
          { label: detail?.fileName ?? "文档详情" },
        ]}
        description={
          detail?.hasOriginalFile || detail?.previewMode === "original"
            ? "查看原文与分片"
            : "历史文档未保留原文件，仅可查看文本与分片"
        }
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(`/kb/${kbId}`)}>
              返回列表
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                navigate(`/kb/${kbId}/upload`, {
                  state: detail?.hasOriginalFile
                    ? {
                        mode: "import",
                        ingestItemId: itemId,
                        fileName: detail.fileName,
                        chunkConfig: detail.chunkConfig,
                      }
                    : {
                        itemId,
                        fileName: detail?.fileName,
                        text: detail?.content,
                        chunks: detail?.chunks,
                        chunkConfig: detail?.chunkConfig,
                      },
                })
              }
              disabled={!detail}
            >
              编辑分片
            </Button>
          </>
        }
      >
        <div className="mt-3 flex gap-2">
          <Button
            variant={tab === "source" ? "primary" : "outline"}
            size="sm"
            onClick={() => setTab("source")}
          >
            原文预览
          </Button>
          <Button
            variant={tab === "chunks" ? "primary" : "outline"}
            size="sm"
            onClick={() => setTab("chunks")}
          >
            分片视图
          </Button>
        </div>
      </PageHeader>

      <PageBody className="flex min-h-0 flex-col overflow-hidden pt-4">
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <LoadingText>正在加载文档</LoadingText>
          </div>
        ) : null}
        {error ? <div className="p-4 text-sm text-destructive">{error}</div> : null}

        {!loading && !error && detail && tab === "source" ? (
          <KbSourcePreview
            kbId={kbId}
            itemId={detail.hasOriginalFile ? itemId : null}
            fileName={detail.fileName}
            text={detail.content}
            textEditable={false}
            initialPage={sourceInitialPage}
            highlightText={activeChunk?.text ?? null}
          />
        ) : null}

        {!loading && !error && detail && tab === "chunks" ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="mb-3 shrink-0 text-sm text-muted-foreground">
              共 {chunkRecords.length} 个分片
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {chunkRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无分片</p>
              ) : (
                chunkRecords.map((chunk) => {
                  const highlighted = activeChunkIndex === chunk.index
                  return (
                    <article
                      key={chunk.chunkId}
                      ref={highlighted ? highlightRef : undefined}
                      className={[
                        "rounded-md border p-3",
                        highlighted ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "",
                      ].join(" ")}
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>
                          分片 #{chunk.index + 1}
                          {chunk.pageStart != null
                            ? ` · 页 ${chunk.pageStart}${
                                chunk.pageEnd != null && chunk.pageEnd !== chunk.pageStart
                                  ? `-${chunk.pageEnd}`
                                  : ""
                              }`
                            : ""}
                          {chunk.sourceKind ? ` · ${chunk.sourceKind}` : ""}
                          {highlighted ? <span className="ml-2 text-primary">召回命中</span> : null}
                        </span>
                        <span>{formatCharCountK(chunk.text.length)}</span>
                      </div>
                      <pre className="whitespace-pre-wrap break-words text-sm">{chunk.text}</pre>
                    </article>
                  )
                })
              )}
            </div>
          </div>
        ) : null}
      </div>
      </PageBody>
    </Page>
  )
}
