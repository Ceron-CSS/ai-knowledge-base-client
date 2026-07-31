import { useParams } from "react-router-dom"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingText } from "@/components/ui/loading-text"
import { MultiSelect } from "@/components/ui/multi-select"
import { Textarea } from "@/components/ui/textarea"
import type { ChunkPreviewSeparator } from "@/api/kb"
import { CHUNK_SEPARATOR_OPTIONS } from "@/features/kb/constants/chunkPreview"
import { useKbUploadPreview } from "@/features/kb/hooks/useKbUploadPreview"

export function KbUploadPreviewPage() {
  const { id = "" } = useParams()
  const preview = useKbUploadPreview({ kbId: id })

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
        {preview.fileName ? <p className="mt-1 text-xs text-muted-foreground">当前文件：{preview.fileName}</p> : null}
      </div>

      <div className="mt-4 grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[420px_1fr]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background p-4">
          <div className="flex h-full min-h-0 flex-col gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium">分段模式</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={["rounded-md border px-3 py-2 text-sm", preview.mode === "smart" ? "border-primary bg-primary/5" : "hover:bg-muted/60"].join(" ")}
                  onClick={() => preview.setMode("smart")}
                >
                  智能分段
                </button>
                <button
                  type="button"
                  className={["rounded-md border px-3 py-2 text-sm", preview.mode === "advanced" ? "border-primary bg-primary/5" : "hover:bg-muted/60"].join(" ")}
                  onClick={() => preview.setMode("advanced")}
                >
                  高级分段
                </button>
              </div>
            </div>

            {preview.mode === "advanced" ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium">分段标识符</label>
                  <MultiSelect
                    value={preview.separators}
                    onValueChange={(values) => preview.setSeparators(values as ChunkPreviewSeparator[])}
                    options={[...CHUNK_SEPARATOR_OPTIONS]}
                    placeholder="选择分段标识符"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">单片最大长度(最小为100)</label>
                  <Input
                    type="number"
                    min={100}
                    max={2000}
                    step={10}
                    value={preview.maxLengthInput}
                    onChange={(e) => preview.handleMaxLengthInputChange(e.target.value)}
                    onBlur={preview.handleMaxLengthBlur}
                  />
                </div>
                <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>自动清洗（去重复符号/空格/空行/Tab）</span>
                  <input type="checkbox" checked={preview.trimSpaces} onChange={(e) => preview.setTrimSpaces(e.target.checked)} />
                </label>
              </>
            ) : null}

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <label className="mb-2 shrink-0 text-sm font-medium">预览文本</label>
              <Textarea
                rows={16}
                value={preview.text}
                onChange={(e) => preview.setText(e.target.value)}
                placeholder="粘贴待切分文档内容..."
                className="min-h-0 flex-1 resize-none overflow-y-auto"
              />
            </div>

            <Button
              className="w-full shrink-0"
              variant="primary"
              size="lg"
              onClick={preview.onGenerate}
              disabled={!preview.canPreview && !preview.loading}
              loading={preview.loading}
            >
              生成预览
            </Button>
            <Button
              className="w-full shrink-0"
              variant="primary"
              size="lg"
              onClick={preview.onSave}
              disabled={!preview.canSave}
              loading={preview.saving}
            >
              {preview.saving ? "正在处理并保存" : "保存到知识库"}
            </Button>
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background p-4">
          <div className="mb-3 text-sm text-muted-foreground">
            {preview.loading ? (
              <LoadingText className="justify-start">正在生成分片</LoadingText>
            ) : (
              preview.previewStatusText
            )}
          </div>
          {preview.error ? <div className="mb-3 text-sm text-destructive">{preview.error}</div> : null}
          {preview.saveError ? <div className="mb-3 text-sm text-destructive">{preview.saveError}</div> : null}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {preview.chunks.length ? (
              preview.chunks.map((chunk) => {
                const highlighted =
                  preview.highlightChunkIndex !== null && chunk.index === preview.highlightChunkIndex + 1
                return (
                  <article
                    key={chunk.index}
                    ref={highlighted ? preview.highlightChunkRef : undefined}
                    className={[
                      "rounded-md border p-3",
                      highlighted ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "",
                    ].join(" ")}
                  >
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        分片序号 #{chunk.index}
                        {highlighted ? <span className="ml-2 text-primary">召回命中</span> : null}
                      </span>
                      <span>当前分片字数 {preview.formatCharCountK(chunk.charCount)}</span>
                    </div>
                    <pre className="whitespace-pre-wrap break-words text-sm">{chunk.text}</pre>
                  </article>
                )
              })
            ) : preview.text.trim() ? (
              <article className="rounded-md border p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>原始内容</span>
                  <span>当前字数 {preview.formatCharCountK(preview.text.length)}</span>
                </div>
                <pre className="whitespace-pre-wrap break-words text-sm">{preview.text}</pre>
              </article>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
