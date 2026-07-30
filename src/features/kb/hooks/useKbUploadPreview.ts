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

export function useKbUploadPreview({ kbId }: UseKbUploadPreviewOptions) {
  const navigate = useNavigate()
  const location = useLocation()
  const [text, setText] = useState("")
  const [fileName, setFileName] = useState("")
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [mode, setMode] = useState<ChunkPreviewMode>("smart")
  const [separators, setSeparators] = useState<ChunkPreviewSeparator[]>([])
  const [maxLength, setMaxLength] = useState(500)
  const [maxLengthInput, setMaxLengthInput] = useState("500")
  const [trimSpaces, setTrimSpaces] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chunks, setChunks] = useState<ChunkPreviewChunk[]>([])
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

  function resolveMaxLength() {
    return maxLengthInput === "" ? maxLength : clampMaxLength(Number(maxLengthInput))
  }

  function currentSnapshot(resolvedMaxLength: number): ChunkPreviewSnapshot {
    return { text, mode, separators, maxLength: resolvedMaxLength, trimSpaces }
  }

  useEffect(() => {
    const state = location.state as KbUploadNavigationState | null
    if (!state?.text) return
    setEditingItemId(state.itemId ?? null)
    setText(state.text)
    setFileName(state.fileName ?? "")
    if (state.chunkConfig) {
      setMode(state.chunkConfig.mode)
      setSeparators(state.chunkConfig.separators)
      const nextMaxLength = clampMaxLength(state.chunkConfig.maxLength)
      setMaxLength(nextMaxLength)
      setMaxLengthInput(String(nextMaxLength))
      setTrimSpaces(state.chunkConfig.trimSpaces)
    }
    if (Array.isArray(state.chunks) && state.chunks.length) {
      setChunks(
        state.chunks.map((chunk, index) => ({
          index: index + 1,
          charCount: chunk.length,
          text: chunk,
        })),
      )
    }
    setPreviewSnapshot(null)
  }, [location.state])

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
