import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { MultiSelect } from "@/components/ui/multi-select"
import {
  createKbItem,
  streamKbChunkPreview,
  updateKbItem,
  type ChunkPreviewChunk,
  type ChunkPreviewMode,
  type ChunkPreviewSeparator,
} from "@/api/kb"

const separatorOptions = [
  { label: "换行符", value: "newline" },
  { label: "#", value: "markdown_h1" },
  { label: "##", value: "markdown_h2" },
  { label: "###", value: "markdown_h3" },
  { label: "####", value: "markdown_h4" },
  { label: "数字序号", value: "numbered_list" },
  { label: "中文序号", value: "chinese_numbered_list" },
]

function formatCharCountK(value: number) {
  if (value <= 0) return "0K"
  return `${(value / 1000).toFixed(value >= 1000 ? 1 : 2)}K`
}

function clampMaxLength(value: number) {
  return Math.min(2000, Math.max(100, Math.round(value)))
}

export function KbUploadPreviewPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id = "" } = useParams()
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
    const state = location.state as {
      itemId?: string
      fileName?: string
      text?: string
      chunks?: string[]
      chunkConfig?: {
        mode: ChunkPreviewMode
        separators: ChunkPreviewSeparator[]
        maxLength: number
        trimSpaces: boolean
      }
    } | null
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
        id,
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
        await updateKbItem(id, editingItemId, {
          fileName,
          content: text,
          chunks: chunks.map((c) => c.text),
          chunkConfig: { mode, separators, maxLength, trimSpaces },
        })
      } else {
        await createKbItem(id, {
          fileName,
          content: text,
          chunks: chunks.map((c) => c.text),
          chunkConfig: { mode, separators, maxLength, trimSpaces },
        })
      }
      navigate(`/kb/${id}`)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-55px)] flex-col overflow-hidden">
      <div>
        <Breadcrumb
          items={[
            { label: "知识库", href: "/kb" },
            { label: "文档列表", href: `/kb/${id}` },
            { label: "分段预览" },
          ]}
        />
        <p className="mt-1 text-sm text-muted-foreground">左侧配置分段参数，右侧流式查看分片结果</p>
        {fileName ? <p className="mt-1 text-xs text-muted-foreground">当前文件：{fileName}</p> : null}
      </div>

      <div className="mt-4 grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[420px_1fr]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background p-4">
          <div className="flex h-full min-h-0 flex-col gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium">分段模式</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={["rounded-md border px-3 py-2 text-sm", mode === "smart" ? "border-primary bg-primary/5" : "hover:bg-muted/60"].join(" ")}
                  onClick={() => setMode("smart")}
                >
                  智能分段
                </button>
                <button
                  type="button"
                  className={["rounded-md border px-3 py-2 text-sm", mode === "advanced" ? "border-primary bg-primary/5" : "hover:bg-muted/60"].join(" ")}
                  onClick={() => setMode("advanced")}
                >
                  高级分段
                </button>
              </div>
            </div>

            {mode === "advanced" ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium">分段标识符</label>
                  <MultiSelect
                    value={separators}
                    onValueChange={(values) => setSeparators(values as ChunkPreviewSeparator[])}
                    options={separatorOptions}
                    placeholder="选择分段标识符"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">单片最大长度(最小为100)</label>
                  <input
                    type="number"
                    min={100}
                    max={2000}
                    step={10}
                    value={maxLengthInput}
                    onChange={(e) => {
                      const next = e.target.value
                      if (!/^\d*$/.test(next)) return
                      setMaxLengthInput(next)
                      if (next === "") return
                      const parsed = Number(next)
                      if (Number.isFinite(parsed)) setMaxLength(parsed)
                    }}
                    onBlur={() => {
                      const next = maxLengthInput === "" ? maxLength : clampMaxLength(Number(maxLengthInput))
                      setMaxLength(next)
                      setMaxLengthInput(String(next))
                    }}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
                  />
                </div>
                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>自动清洗（去重复符号/空格/空行/Tab）</span>
                  <input type="checkbox" checked={trimSpaces} onChange={(e) => setTrimSpaces(e.target.checked)} />
                </label>
              </>
            ) : null}

            <div className="flex min-h-0 flex-1 flex-col">
              <label className="mb-2 shrink-0 text-sm font-medium">预览文本</label>
              <textarea
                rows={16}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="粘贴待切分文档内容..."
                className="min-h-[120px] flex-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
              />
            </div>

            <button
              className="mt-auto w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              onClick={onGenerate}
              disabled={!canPreview}
            >
             生成预览
            </button>
            <button
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              onClick={onSave}
              disabled={saving || loading || chunks.length === 0 || !previewGenerated}
            >
              保存到知识库
            </button>
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background p-4">
          <div className="mb-3 text-sm text-muted-foreground">
            {loading ? "正在流式返回分片..." : chunks.length ? `共 ${chunks.length} 个分片` : "点击左侧按钮开始预览"}
          </div>
          {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}
          {saveError ? <div className="mb-3 text-sm text-destructive">{saveError}</div> : null}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {chunks.map((chunk) => (
              <article key={chunk.index} className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>分片序号 #{chunk.index}</span>
                  <span>当前分片字数 {formatCharCountK(chunk.charCount)}</span>
                </div>
                <pre className="whitespace-pre-wrap break-words text-sm">{chunk.text}</pre>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
