import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { getKbItemDetail, type KbItemChunkRecord, type KbItemDetail } from "@/api/kb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingText } from "@/components/ui/loading-text"
import { Page, PageBody, PageHeader } from "@/components/ui/page-header"
import { KbSourcePreview } from "@/features/kb/components/KbSourcePreview"
import { useKb } from "@/features/kb/hooks/queries"
import { formatCharCountK } from "@/features/kb/lib/formatCharCountK"

type DetailTab = "source" | "chunks"
const CHUNK_PAGE_SIZE = 80

export function KbItemDetailPage() {
  const { id: kbId = "", itemId = "" } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<KbItemDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chunkSearch, setChunkSearch] = useState("")
  const [chunkPageIndex, setChunkPageIndex] = useState(0)
  const highlightRef = useRef<HTMLButtonElement | null>(null)
  const kb = useKb(kbId)

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

  const visibleChunks = useMemo(() => {
    const query = chunkSearch.trim().toLowerCase()
    if (!query) return chunkRecords
    return chunkRecords.filter((chunk) => chunk.text.toLowerCase().includes(query))
  }, [chunkRecords, chunkSearch])
  const activeVisibleChunkIndex = useMemo(() => {
    if (activeChunkIndex == null) return -1
    return visibleChunks.findIndex((chunk) => chunk.index === activeChunkIndex)
  }, [activeChunkIndex, visibleChunks])
  const chunkPageCount = Math.max(1, Math.ceil(visibleChunks.length / CHUNK_PAGE_SIZE))
  const activeChunkPageIndex =
    activeVisibleChunkIndex >= 0 ? Math.floor(activeVisibleChunkIndex / CHUNK_PAGE_SIZE) : null
  const normalizedChunkPageIndex = Math.min(
    activeChunkPageIndex ?? chunkPageIndex,
    chunkPageCount - 1,
  )
  const pagedChunks = useMemo(() => {
    const start = normalizedChunkPageIndex * CHUNK_PAGE_SIZE
    return visibleChunks.slice(start, start + CHUNK_PAGE_SIZE)
  }, [normalizedChunkPageIndex, visibleChunks])

  const sourceInitialPage = useMemo(() => {
    if (Number.isFinite(page) && page > 0 && searchParams.has("page")) return Math.floor(page)
    const chunkPage = activeChunk?.pageStart
    if (typeof chunkPage === "number" && chunkPage > 0) return Math.floor(chunkPage)
    return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  }, [activeChunk?.pageStart, page, searchParams])

  const selectChunk = useCallback((index: number) => {
    const params = new URLSearchParams(searchParams)
    params.set("tab", "chunks")
    params.set("chunkIndex", String(index))
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (tab !== "chunks" || activeChunkIndex == null) return
    highlightRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [tab, activeChunkIndex, chunkRecords.length])

  useEffect(() => {
    if (tab !== "chunks" || chunkRecords.length === 0) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return
      event.preventDefault()
      const currentIndex = activeChunkIndex ?? chunkRecords[0].index
      const offset = event.key === "ArrowDown" ? 1 : -1
      const nextIndex = Math.min(
        chunkRecords[chunkRecords.length - 1].index,
        Math.max(chunkRecords[0].index, currentIndex + offset),
      )
      selectChunk(nextIndex)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [activeChunkIndex, chunkRecords, selectChunk, tab])

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
          { label: kb.data?.name ?? "加载中…", href: "/kb" },
          { label: "文档列表", href: `/kb/${kbId}` },
          { label: detail?.fileName ?? "文档详情" },
        ]}
        description={
          detail?.hasOriginalFile || detail?.previewMode === "original"
            ? "查看原文与分片"
            : "历史文档未保留原文件，仅可查看文本与分片"
        }
      >
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={tab === "source" ? "primary" : "tint"}
              size="lg"
              onClick={() => setTab("source")}
            >
              原文预览
            </Button>
            <Button
              variant={tab === "chunks" ? "primary" : "tint"}
              size="lg"
              onClick={() => setTab("chunks")}
            >
              分片视图
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="dialog-cancel" size="lg" onClick={() => navigate(`/kb/${kbId}`)}>
              返回列表
            </Button>
            <Button
              variant="primary"
              size="lg"
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
          </div>
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
            <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="flex min-h-0 flex-col rounded-lg border border-border bg-background/40 p-3">
                <div className="shrink-0 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium">Chunk 列表</span>
                    <span className="text-xs text-muted-foreground">
                      {visibleChunks.length}/{chunkRecords.length} · 上下键切换
                    </span>
                  </div>
                  <Input
                    value={chunkSearch}
                    onChange={(event) => {
                      setChunkSearch(event.target.value)
                      setChunkPageIndex(0)
                    }}
                    placeholder="搜索 Chunk 文本"
                  />
                  {visibleChunks.length > CHUNK_PAGE_SIZE ? (
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <Button
                        variant="tint"
                        size="sm"
                        disabled={normalizedChunkPageIndex <= 0}
                        onClick={() => setChunkPageIndex((value) => Math.max(0, value - 1))}
                      >
                        上一页
                      </Button>
                      <span>
                        {normalizedChunkPageIndex + 1}/{chunkPageCount} · 每页 {CHUNK_PAGE_SIZE} 条
                      </span>
                      <Button
                        variant="tint"
                        size="sm"
                        disabled={normalizedChunkPageIndex >= chunkPageCount - 1}
                        onClick={() =>
                          setChunkPageIndex((value) => Math.min(chunkPageCount - 1, value + 1))
                        }
                      >
                        下一页
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {visibleChunks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">没有匹配的分片</p>
                  ) : (
                    pagedChunks.map((chunk) => {
                      const highlighted = activeChunkIndex === chunk.index
                      return (
                        <button
                          key={chunk.chunkId}
                          ref={highlighted ? highlightRef : undefined}
                          type="button"
                          className={[
                            "w-full rounded-md border p-3 text-left transition hover:bg-muted/40",
                            highlighted ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "",
                          ].join(" ")}
                          onClick={() => selectChunk(chunk.index)}
                        >
                          <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span>
                              #{chunk.index + 1}
                              {chunk.pageStart != null
                                ? ` · 页${chunk.pageStart}${
                                    chunk.pageEnd != null && chunk.pageEnd !== chunk.pageStart
                                      ? `-${chunk.pageEnd}`
                                      : ""
                                  }`
                                : ""}
                              {chunk.sourceKind ? ` · ${chunk.sourceKind}` : ""}
                              {highlighted ? <span className="ml-2 text-primary">当前位置</span> : null}
                            </span>
                            <span>{formatCharCountK(chunk.text.length)}</span>
                          </div>
                          <div className="line-clamp-3 text-sm">{chunk.text}</div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="flex min-h-0 flex-col rounded-lg border border-border bg-background/40 p-3">
                {activeChunk ? (
                  <>
                    <div className="shrink-0 border-b border-border pb-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium">当前 Chunk #{activeChunk.index + 1}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {activeChunk.pageStart != null
                              ? `页${activeChunk.pageStart}${
                                  activeChunk.pageEnd != null && activeChunk.pageEnd !== activeChunk.pageStart
                                    ? `-${activeChunk.pageEnd}`
                                    : ""
                                } · `
                              : ""}
                            {formatCharCountK(activeChunk.text.length)}
                            {activeChunk.sourceKind ? ` · ${activeChunk.sourceKind}` : ""}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="tint"
                            size="sm"
                            disabled={activeChunk.index <= 0}
                            onClick={() => selectChunk(activeChunk.index - 1)}
                          >
                            上一条
                          </Button>
                          <Button
                            variant="tint"
                            size="sm"
                            disabled={activeChunk.index >= chunkRecords.length - 1}
                            onClick={() => selectChunk(activeChunk.index + 1)}
                          >
                            下一条
                          </Button>
                          <Button variant="tint" size="sm" onClick={() => setTab("source")}>
                            打开原文
                          </Button>
                        </div>
                      </div>
                    </div>
                    <pre className="mt-3 min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 text-sm">
                      {activeChunk.text}
                    </pre>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    请选择左侧 Chunk 查看完整文本和来源信息
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </PageBody>
    </Page>
  )
}
