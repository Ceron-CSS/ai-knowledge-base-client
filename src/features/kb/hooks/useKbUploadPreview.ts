import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  createKbItem,
  fetchKbChunkPreview,
  streamKbChunkPreview,
  updateKbItem,
  type ChunkPreviewChunk,
  type ChunkPreviewMode,
  type ChunkPreviewSeparator,
} from "@/api/kb"
import { clampMaxLength } from "@/features/kb/lib/clampMaxLength"
import {
  chunkPreviewSnapshotMatches,
  type ChunkPreviewSnapshot,
} from "@/features/kb/lib/chunkPreviewSnapshot"
import { formatCharCountK } from "@/features/kb/lib/formatCharCountK"
import type { KbUploadNavigationState } from "@/features/kb/types"

type UseKbUploadPreviewOptions = {
  kbId: string
}

type UploadPreviewInitialState = {
  editingItemId: string | null
  text: string
  fileName: string
  mode: ChunkPreviewMode
  separators: ChunkPreviewSeparator[]
  maxLength: number
  maxLengthInput: string
  trimSpaces: boolean
  chunks: ChunkPreviewChunk[]
  highlightChunkIndex: number | null
}

function buildUploadPreviewInitialState(state: unknown): UploadPreviewInitialState | null {
  const nav = state as KbUploadNavigationState | null
  if (!nav?.text) return null

  const initial: UploadPreviewInitialState = {
    editingItemId: nav.itemId ?? null,
    text: nav.text,
    fileName: nav.fileName ?? "",
    mode: "smart",
    separators: [],
    maxLength: 500,
    maxLengthInput: "500",
    trimSpaces: true,
    chunks: [],
    highlightChunkIndex:
      typeof nav.highlightChunkIndex === "number" && Number.isFinite(nav.highlightChunkIndex)
        ? Math.max(0, Math.floor(nav.highlightChunkIndex))
        : null,
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
  const [text, setText] = useState(() => buildUploadPreviewInitialState(location.state)?.text ?? "")
  const [fileName] = useState(() => buildUploadPreviewInitialState(location.state)?.fileName ?? "")
  const [editingItemId] = useState<string | null>(
    () => buildUploadPreviewInitialState(location.state)?.editingItemId ?? null,
  )
  const [mode, setMode] = useState<ChunkPreviewMode>(
    () => buildUploadPreviewInitialState(location.state)?.mode ?? "smart",
  )
  const [separators, setSeparators] = useState<ChunkPreviewSeparator[]>(
    () => buildUploadPreviewInitialState(location.state)?.separators ?? [],
  )
  const [maxLength, setMaxLength] = useState(
    () => buildUploadPreviewInitialState(location.state)?.maxLength ?? 500,
  )
  const [maxLengthInput, setMaxLengthInput] = useState(
    () => buildUploadPreviewInitialState(location.state)?.maxLengthInput ?? "500",
  )
  const [trimSpaces, setTrimSpaces] = useState(
    () => buildUploadPreviewInitialState(location.state)?.trimSpaces ?? true,
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chunks, setChunks] = useState<ChunkPreviewChunk[]>(
    () => buildUploadPreviewInitialState(location.state)?.chunks ?? [],
  )
  const [highlightChunkIndex] = useState<number | null>(
    () => buildUploadPreviewInitialState(location.state)?.highlightChunkIndex ?? null,
  )
  const highlightChunkRef = useRef<HTMLElement | null>(null)
  const [previewSnapshot, setPreviewSnapshot] = useState<ChunkPreviewSnapshot | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const lastSaveAtRef = useRef(0)

  const canPreview = useMemo(() => text.trim().length > 0 && !loading && !saving, [text, loading, saving])
  const canSave = useMemo(
    () => fileName.trim().length > 0 && text.trim().length > 0 && !loading && !saving,
    [fileName, text, loading, saving],
  )

  useEffect(() => {
    if (highlightChunkIndex === null) return
    const frame = window.requestAnimationFrame(() => {
      highlightChunkRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [highlightChunkIndex, chunks.length])

  function resolveMaxLength() {
    return maxLengthInput === "" ? maxLength : clampMaxLength(Number(maxLengthInput))
  }

  function currentSnapshot(resolvedMaxLength: number): ChunkPreviewSnapshot {
    return { text, mode, separators, maxLength: resolvedMaxLength, trimSpaces }
  }

  async function onGenerate() {
    setError(null)
    setPreviewSnapshot(null)
    setChunks([])
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    const previewMaxLength = resolveMaxLength()
    setMaxLength(previewMaxLength)
    setMaxLengthInput(String(previewMaxLength))
    const snapshot = currentSnapshot(previewMaxLength)
    try {
      await streamKbChunkPreview(
        kbId,
        snapshot,
        (chunk) => setChunks((prev) => [...prev, chunk]),
        controller.signal,
      )
      setPreviewSnapshot(snapshot)
    } catch (e) {
      setError(e instanceof Error ? e.message : "预览失败")
    } finally {
      setLoading(false)
    }
  }

  async function resolveChunksForSave(resolvedMaxLength: number): Promise<string[]> {
    const snapshot = currentSnapshot(resolvedMaxLength)
    if (previewSnapshot && chunkPreviewSnapshotMatches(snapshot, previewSnapshot) && chunks.length > 0) {
      return chunks.map((chunk) => chunk.text)
    }

    const generated = await fetchKbChunkPreview(kbId, snapshot)
    if (!generated.length) {
      throw new Error("分片结果为空，请检查文本内容或分段参数")
    }
    return generated.map((chunk) => chunk.text)
  }

  async function onSave() {
    const now = Date.now()
    if (now - lastSaveAtRef.current < 800) return
    lastSaveAtRef.current = now

    if (!fileName.trim()) {
      setSaveError("缺少文件名，请重新上传文件")
      return
    }
    if (!text.trim()) {
      setSaveError("文本内容不能为空")
      return
    }
    setSaveError(null)
    setSaving(true)
    const saveMaxLength = resolveMaxLength()
    setMaxLength(saveMaxLength)
    setMaxLengthInput(String(saveMaxLength))
    try {
      const chunkTexts = await resolveChunksForSave(saveMaxLength)
      const chunkConfig = { mode, separators, maxLength: saveMaxLength, trimSpaces }
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
      navigate(`/kb/${kbId}`)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "保存失败")
    } finally {
      setSaving(false)
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

  const previewStatusText = loading
    ? "正在生成分片"
    : chunks.length
      ? `共 ${chunks.length} 个分片`
      : text.trim()
        ? "原始内容预览"
        : "点击左侧按钮开始预览"

  return {
    text,
    setText,
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
    highlightChunkRef,
    saving,
    saveError,
    canPreview,
    canSave,
    previewStatusText,
    formatCharCountK,
    onGenerate: () => void onGenerate(),
    onSave: () => void onSave(),
    handleMaxLengthInputChange,
    handleMaxLengthBlur,
  }
}
