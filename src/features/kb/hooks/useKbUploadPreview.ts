import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  createKbItem,
  fetchKbChunkPreview,
  finalizeKbItem,
  getKbItemDetail,
  getKbItemIngestion,
  listKbItemPages,
  retryKbItemExtraction,
  streamKbChunkPreview,
  streamKbItemChunkPreview,
  updateKbItem,
  type ChunkPreviewChunk,
  type ChunkPreviewMode,
  type ChunkPreviewSeparator,
  type ItemChunkPreviewChunk,
  type KbItemPage,
} from "@/api/kb"
import { clampMaxLength } from "@/features/kb/lib/clampMaxLength"
import {
  chunkPreviewSnapshotMatches,
  type ChunkPreviewSnapshot,
} from "@/features/kb/lib/chunkPreviewSnapshot"
import { formatCharCountK } from "@/features/kb/lib/formatCharCountK"
import type { KbUploadNavigationState } from "@/features/kb/types"

export type UploadWizardStep = "source" | "chunking"

type UseKbUploadPreviewOptions = {
  kbId: string
}

type UploadPreviewInitialState = {
  editingItemId: string | null
  ingestItemId: string | null
  isImportFlow: boolean
  text: string
  fileName: string
  mode: ChunkPreviewMode
  separators: ChunkPreviewSeparator[]
  maxLength: number
  maxLengthInput: string
  trimSpaces: boolean
  chunks: ChunkPreviewChunk[]
  highlightChunkIndex: number | null
  sourcePage: number | null
  startStep: UploadWizardStep
}

const WIZARD_STEPS: Array<{ id: UploadWizardStep; label: string }> = [
  { id: "source", label: "原文预览" },
  { id: "chunking", label: "分片配置与预览" },
]

function buildUploadPreviewInitialState(state: unknown): UploadPreviewInitialState | null {
  const nav = state as KbUploadNavigationState | null
  if (!nav) return null
  if (!nav.text && !nav.ingestItemId) return null

  const hasHighlight =
    typeof nav.highlightChunkIndex === "number" && Number.isFinite(nav.highlightChunkIndex)
  const sourcePage =
    typeof nav.sourcePage === "number" && Number.isFinite(nav.sourcePage) && nav.sourcePage > 0
      ? Math.floor(nav.sourcePage)
      : null

  const initial: UploadPreviewInitialState = {
    editingItemId: nav.itemId ?? null,
    ingestItemId: nav.ingestItemId ?? null,
    isImportFlow: Boolean(nav.ingestItemId) || nav.mode === "import",
    text: nav.text ?? "",
    fileName: nav.fileName ?? "",
    mode: "smart",
    separators: [],
    maxLength: 500,
    maxLengthInput: "500",
    trimSpaces: true,
    chunks: [],
    highlightChunkIndex: hasHighlight ? Math.max(0, Math.floor(nav.highlightChunkIndex!)) : null,
    sourcePage,
    // 有原文页码时优先看原文；否则有分片命中时进入分片预览
    startStep: sourcePage ? "source" : hasHighlight ? "chunking" : "source",
  }

  if (nav.chunkConfig) {
    initial.mode = nav.chunkConfig.mode
    initial.separators = nav.chunkConfig.separators
    const nextMaxLength = clampMaxLength(nav.chunkConfig.maxLength)
    initial.maxLength = nextMaxLength
    initial.maxLengthInput = String(nextMaxLength)
    initial.trimSpaces = nav.chunkConfig.trimSpaces
  }

  if (Array.isArray(nav.chunks) && nav.chunks.length) {
    initial.chunks = nav.chunks.map((chunk, index) => ({
      index: index + 1,
      charCount: chunk.length,
      text: chunk,
    }))
  }

  return initial
}

export function useKbUploadPreview({ kbId }: UseKbUploadPreviewOptions) {
  const navigate = useNavigate()
  const location = useLocation()
  const initial = buildUploadPreviewInitialState(location.state)

  const [step, setStep] = useState<UploadWizardStep>(() => initial?.startStep ?? "source")
  const [text, setText] = useState(() => initial?.text ?? "")
  const [fileName] = useState(() => initial?.fileName ?? "")
  const [editingItemId] = useState<string | null>(() => initial?.editingItemId ?? null)
  const [ingestItemId] = useState<string | null>(() => initial?.ingestItemId ?? null)
  const [isImportFlow] = useState(() => initial?.isImportFlow ?? false)
  const [preferredStartStep] = useState<UploadWizardStep>(() => initial?.startStep ?? "source")
  const [initialChunks] = useState(() => initial?.chunks ?? [])
  const [pages, setPages] = useState<KbItemPage[]>([])
  const [ingestionStatus, setIngestionStatus] = useState<string | null>(null)
  const [ingestionError, setIngestionError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<
    Array<{ pageNumber: number; errorCode?: string | null; extractionMethod: string }>
  >([])
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [pageRevision, setPageRevision] = useState<string | null>(null)
  const [configHash, setConfigHash] = useState<string | null>(null)
  const [mode, setMode] = useState<ChunkPreviewMode>(() => initial?.mode ?? "smart")
  const [separators, setSeparators] = useState<ChunkPreviewSeparator[]>(
    () => initial?.separators ?? [],
  )
  const [maxLength, setMaxLength] = useState(() => initial?.maxLength ?? 500)
  const [maxLengthInput, setMaxLengthInput] = useState(() => initial?.maxLengthInput ?? "500")
  const [trimSpaces, setTrimSpaces] = useState(() => initial?.trimSpaces ?? true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chunks, setChunks] = useState<ItemChunkPreviewChunk[]>(() => initial?.chunks ?? [])
  const [highlightChunkIndex] = useState<number | null>(() => initial?.highlightChunkIndex ?? null)
  const [sourcePage] = useState<number | null>(() => initial?.sourcePage ?? null)
  const highlightChunkRef = useRef<HTMLElement | null>(null)
  const [previewSnapshot, setPreviewSnapshot] = useState<ChunkPreviewSnapshot | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const extracting = isImportFlow && (ingestionStatus === "extracting" || ingestionStatus === null)
  const extractionFailed = isImportFlow && ingestionStatus === "extraction_failed"
  const readyForChunking =
    !isImportFlow ||
    ingestionStatus === "draft" ||
    ingestionStatus === "active" ||
    ingestionStatus === "indexing" ||
    ingestionStatus === "indexing_failed"

  useEffect(() => {
    if (!isImportFlow || !ingestItemId) return
    let cancelled = false
    let timer: number | undefined

    async function loadReady(status: Awaited<ReturnType<typeof getKbItemIngestion>>) {
      setPageRevision(status.pageRevision ?? null)
      const [detail, pageRows] = await Promise.all([
        getKbItemDetail(kbId, ingestItemId!),
        listKbItemPages(kbId, ingestItemId!),
      ])
      if (cancelled) return
      setText(detail.content)
      setPages(pageRows)
      if (preferredStartStep === "chunking" && initialChunks.length) {
        setChunks(initialChunks)
        setStep("chunking")
      } else {
        setStep("source")
      }
    }

    async function poll() {
      try {
        const status = await getKbItemIngestion(kbId, ingestItemId!)
        if (cancelled) return
        setIngestionStatus(status.status)
        setIngestionError(status.errorCode ?? null)
        setWarnings(status.warnings ?? [])
        setExpiresAt(status.expiresAt ?? null)
        if (
          status.status === "draft" ||
          status.status === "active" ||
          status.status === "indexing" ||
          status.status === "indexing_failed"
        ) {
          await loadReady(status)
          return
        }
        if (status.status === "extraction_failed") return
        // Still extracting (or uploading edge cases).
        if (status.status !== "extracting") {
          setIngestionStatus("extracting")
        }
        timer = window.setTimeout(() => void poll(), 1500)
      } catch (e) {
        if (cancelled) return
        setIngestionError(e instanceof Error ? e.message : "抽取状态查询失败")
        timer = window.setTimeout(() => void poll(), 2500)
      }
    }

    void poll()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [isImportFlow, ingestItemId, kbId, preferredStartStep, initialChunks])

  useEffect(() => {
    if (highlightChunkIndex === null || step !== "chunking") return
    const frame = window.requestAnimationFrame(() => {
      highlightChunkRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [highlightChunkIndex, chunks.length, step])

  function resolveMaxLength() {
    return maxLengthInput === "" ? maxLength : clampMaxLength(Number(maxLengthInput))
  }

  function currentSnapshot(resolvedMaxLength: number): ChunkPreviewSnapshot {
    return { text, mode, separators, maxLength: resolvedMaxLength, trimSpaces }
  }

  async function generateChunks(): Promise<{
    chunks: ItemChunkPreviewChunk[]
    pageRevision: string | null
    configHash: string | null
  }> {
    setError(null)
    setPreviewSnapshot(null)
    setChunks([])
    setConfigHash(null)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    const previewMaxLength = resolveMaxLength()
    setMaxLength(previewMaxLength)
    setMaxLengthInput(String(previewMaxLength))
    const snapshot = currentSnapshot(previewMaxLength)
    let nextRevision: string | null = pageRevision
    let nextHash: string | null = null
    try {
      if (isImportFlow && ingestItemId) {
        const nextChunks: ItemChunkPreviewChunk[] = []
        await streamKbItemChunkPreview(
          kbId,
          ingestItemId,
          {
            mode,
            separators,
            maxLength: previewMaxLength,
            trimSpaces,
          },
          (meta) => {
            nextRevision = meta.pageRevision
            nextHash = meta.configHash
            setPageRevision(meta.pageRevision)
            setConfigHash(meta.configHash)
          },
          (chunk) => {
            nextChunks.push(chunk)
            setChunks([...nextChunks])
          },
          controller.signal,
        )
        if (!nextChunks.length) {
          throw new Error("分片结果为空，请检查抽取文本或分段参数")
        }
        setPreviewSnapshot(snapshot)
        return { chunks: nextChunks, pageRevision: nextRevision, configHash: nextHash }
      }

      const nextChunks: ItemChunkPreviewChunk[] = []
      await streamKbChunkPreview(
        kbId,
        snapshot,
        (chunk) => {
          nextChunks.push(chunk)
          setChunks([...nextChunks])
        },
        controller.signal,
      )
      if (!nextChunks.length) {
        throw new Error("分片结果为空，请检查文本内容或分段参数")
      }
      setPreviewSnapshot(snapshot)
      return { chunks: nextChunks, pageRevision: null, configHash: null }
    } finally {
      setLoading(false)
    }
  }

  async function goNext() {
    setSaveError(null)
    setError(null)
    if (step === "source") {
      if (!readyForChunking) return
      if (!isImportFlow && !text.trim()) {
        setError("文本内容不能为空")
        return
      }
      setStep("chunking")
      try {
        await generateChunks()
      } catch (e) {
        setError(e instanceof Error ? e.message : "预览失败")
      }
      return
    }
    if (step === "chunking") {
      await onComplete()
    }
  }

  function goBack() {
    setError(null)
    setSaveError(null)
    if (step === "chunking") setStep("source")
  }

  async function onComplete() {
    if (!fileName.trim()) {
      setSaveError("缺少文件名，请重新上传文件")
      return
    }
    if (!isImportFlow && !text.trim()) {
      setSaveError("文本内容不能为空")
      return
    }
    setSaveError(null)
    setSaving(true)
    const saveMaxLength = resolveMaxLength()
    setMaxLength(saveMaxLength)
    setMaxLengthInput(String(saveMaxLength))
    try {
      const chunkConfig = { mode, separators, maxLength: saveMaxLength, trimSpaces }
      if (isImportFlow && ingestItemId) {
        const snapshot = currentSnapshot(saveMaxLength)
        let revision = pageRevision
        let hash = configHash
        const needsPreview =
          !revision ||
          !hash ||
          !previewSnapshot ||
          !chunkPreviewSnapshotMatches(snapshot, previewSnapshot) ||
          chunks.length === 0
        if (needsPreview) {
          const generated = await generateChunks()
          revision = generated.pageRevision
          hash = generated.configHash
        }
        if (!revision || !hash) {
          throw new Error("缺少页面版本信息，请返回上一步重新预览")
        }
        await finalizeKbItem(kbId, ingestItemId, {
          chunkConfig,
          pageRevision: revision,
          configHash: hash,
        })
      } else {
        const snapshot = currentSnapshot(saveMaxLength)
        let chunkTexts = chunks.map((chunk) => chunk.text)
        if (
          !previewSnapshot ||
          !chunkPreviewSnapshotMatches(snapshot, previewSnapshot) ||
          chunkTexts.length === 0
        ) {
          const generated = await fetchKbChunkPreview(kbId, snapshot)
          chunkTexts = generated.map((chunk) => chunk.text)
        }
        if (!chunkTexts.length) {
          throw new Error("分片结果为空，请检查文本内容或分段参数")
        }
        if (editingItemId) {
          await updateKbItem(kbId, editingItemId, {
            fileName,
            content: text,
            chunks: chunkTexts,
            chunkConfig,
          })
        } else {
          await createKbItem(kbId, {
            fileName,
            content: text,
            chunks: chunkTexts,
            chunkConfig,
          })
        }
      }
      navigate(`/kb/${kbId}`)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  async function onRetryExtraction() {
    if (!ingestItemId) return
    setIngestionError(null)
    setIngestionStatus("extracting")
    setPages([])
    try {
      await retryKbItemExtraction(kbId, ingestItemId)
    } catch (e) {
      setIngestionError(e instanceof Error ? e.message : "重试失败")
    }
  }

  function handleMaxLengthInputChange(next: string) {
    if (!/^\d*$/.test(next)) return
    setMaxLengthInput(next)
    if (next === "") return
    const parsed = Number(next)
    if (Number.isFinite(parsed)) setMaxLength(parsed)
  }

  function handleMaxLengthBlur() {
    const next = maxLengthInput === "" ? maxLength : clampMaxLength(Number(maxLengthInput))
    setMaxLength(next)
    setMaxLengthInput(String(next))
  }

  const stepIndex = useMemo(
    () => WIZARD_STEPS.findIndex((item) => item.id === step),
    [step],
  )

  const canGoNext = useMemo(() => {
    if (extracting || extractionFailed || loading || saving) return false
    if (step === "source") return readyForChunking && (isImportFlow || text.trim().length > 0)
    if (step === "chunking") return chunks.length > 0
    return false
  }, [
    extracting,
    extractionFailed,
    loading,
    saving,
    step,
    readyForChunking,
    isImportFlow,
    text,
    chunks.length,
  ])

  const nextLabel =
    step === "source"
      ? "下一步：分片配置"
      : saving
        ? "正在提交"
        : "完成并开始索引"

  return {
    steps: WIZARD_STEPS,
    step,
    stepIndex,
    text,
    setText,
    pages,
    fileName,
    mode,
    setMode,
    separators,
    setSeparators,
    maxLengthInput,
    trimSpaces,
    setTrimSpaces,
    loading,
    error,
    chunks,
    highlightChunkIndex,
    sourcePage,
    highlightChunkRef,
    saving,
    saveError,
    formatCharCountK,
    isImportFlow,
    ingestItemId,
    extracting,
    extractionFailed,
    ingestionError,
    warnings,
    expiresAt,
    canGoNext,
    canPreview: readyForChunking && !extracting && !extractionFailed && !loading && !saving,
    nextLabel,
    goNext: () => void goNext(),
    goBack,
    onGenerate: () => {
      void generateChunks().catch((e) => {
        setError(e instanceof Error ? e.message : "预览失败")
      })
    },
    onRetryExtraction: () => void onRetryExtraction(),
    handleMaxLengthInputChange,
    handleMaxLengthBlur,
    backToList: () => navigate(`/kb/${kbId}`),
  }
}
