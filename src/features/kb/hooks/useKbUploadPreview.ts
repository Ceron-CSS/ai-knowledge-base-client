import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  createKbItem,
  streamKbChunkPreview,
  updateKbItem,
  type ChunkPreviewChunk,
  type ChunkPreviewMode,
  type ChunkPreviewSeparator,
} from "@/api/kb"
import { clampMaxLength } from "@/features/kb/lib/clampMaxLength"
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
  const [previewGenerated, setPreviewGenerated] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const lastSaveAtRef = useRef(0)

  const canPreview = useMemo(() => text.trim().length > 0 && !loading, [text, loading])

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
    setPreviewGenerated(false)
  }, [location.state])

  async function onGenerate() {
    setError(null)
    setPreviewGenerated(false)
    setChunks([])
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    const previewMaxLength = maxLengthInput === "" ? maxLength : clampMaxLength(Number(maxLengthInput))
    setMaxLength(previewMaxLength)
    setMaxLengthInput(String(previewMaxLength))
    try {
      await streamKbChunkPreview(
        kbId,
        { text, mode, separators, maxLength: previewMaxLength, trimSpaces },
        (chunk) => setChunks((prev) => [...prev, chunk]),
        controller.signal,
      )
      setPreviewGenerated(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "预览失败")
    } finally {
      setLoading(false)
    }
  }

  async function onSave() {
    const now = Date.now()
    if (now - lastSaveAtRef.current < 800) return
    lastSaveAtRef.current = now

    if (!fileName.trim()) {
      setSaveError("缺少文件名，请重新上传文件")
      return
    }
    if (!chunks.length) {
      setSaveError("请先生成分段预览后再保存")
      return
    }
    setSaveError(null)
    setSaving(true)
    try {
      if (editingItemId) {
        await updateKbItem(kbId, editingItemId, {
          fileName,
          content: text,
          chunks: chunks.map((c) => c.text),
          chunkConfig: { mode, separators, maxLength, trimSpaces },
        })
      } else {
        await createKbItem(kbId, {
          fileName,
          content: text,
          chunks: chunks.map((c) => c.text),
          chunkConfig: { mode, separators, maxLength, trimSpaces },
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
    previewGenerated,
    saving,
    saveError,
    canPreview,
    previewStatusText,
    formatCharCountK,
    onGenerate: () => void onGenerate(),
    onSave: () => void onSave(),
    handleMaxLengthInputChange,
    handleMaxLengthBlur,
  }
}
