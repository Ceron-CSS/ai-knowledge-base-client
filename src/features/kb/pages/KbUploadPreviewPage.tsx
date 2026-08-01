import { useParams } from "react-router-dom"
import type { ChunkPreviewSeparator } from "@/api/kb"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingText } from "@/components/ui/loading-text"
import { MultiSelect } from "@/components/ui/multi-select"
import { KbSourcePreview } from "@/features/kb/components/KbSourcePreview"
import { CHUNK_SEPARATOR_OPTIONS } from "@/features/kb/constants/chunkPreview"
import { useKbUploadPreview } from "@/features/kb/hooks/useKbUploadPreview"

export function KbUploadPreviewPage() {
  const { id = "" } = useParams()
  const wizard = useKbUploadPreview({ kbId: id })

  return (
    <div className="flex h-[calc(100vh-55px)] flex-col overflow-hidden">
      <div>
        <Breadcrumb
          items={[
            { label: "知识库", href: "/kb" },
            { label: "文档列表", href: `/kb/${id}` },
            { label: "导入文档" },
          ]}
        />
        <p className="mt-1 text-sm text-muted-foreground">
          先确认原文，再配置分片并预览，最后提交索引
        </p>
        {wizard.fileName ? (
          <p className="mt-1 text-xs text-muted-foreground">当前文件：{wizard.fileName}</p>
        ) : null}
        {wizard.expiresAt ? (
          <p className="mt-1 text-xs text-muted-foreground">
            草稿到期：{new Date(wizard.expiresAt).toLocaleString()}
          </p>
        ) : null}
        {wizard.warnings.length > 0 ? (
          <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <div className="font-medium">抽取警告（{wizard.warnings.length}）</div>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {wizard.warnings.slice(0, 5).map((warning) => (
                <li key={`${warning.pageNumber}-${warning.errorCode ?? warning.extractionMethod}`}>
                  第 {warning.pageNumber} 页
                  {warning.errorCode ? `：${warning.errorCode}` : ""}
                </li>
              ))}
              {wizard.warnings.length > 5 ? (
                <li>另有 {wizard.warnings.length - 5} 条警告…</li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>

      <ol className="mt-4 flex flex-wrap gap-2">
        {wizard.steps.map((item, index) => {
          const active = item.id === wizard.step
          const done = index < wizard.stepIndex
          return (
            <li
              key={item.id}
              className={[
                "rounded-md border px-3 py-1.5 text-sm",
                active
                  ? "border-primary bg-primary/5 text-foreground"
                  : done
                    ? "border-border text-foreground"
                    : "border-dashed text-muted-foreground",
              ].join(" ")}
            >
              <span className="mr-1.5 tabular-nums text-muted-foreground">{index + 1}.</span>
              {item.label}
            </li>
          )
        })}
      </ol>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background">
        <div className="min-h-0 flex-1 overflow-hidden p-4">
          {wizard.extracting ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <LoadingText>正在抽取文档内容，请稍候</LoadingText>
              <p>抽取完成后将自动进入原文预览</p>
            </div>
          ) : null}

          {wizard.extractionFailed ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm">
              <p className="text-destructive">
                抽取失败{wizard.ingestionError ? `：${wizard.ingestionError}` : ""}
              </p>
              <Button variant="primary" onClick={wizard.onRetryExtraction}>
                重试抽取
              </Button>
            </div>
          ) : null}

          {!wizard.extracting && !wizard.extractionFailed && wizard.step === "source" ? (
            <KbSourcePreview
              kbId={id}
              itemId={wizard.ingestItemId}
              fileName={wizard.fileName}
              text={wizard.text}
              textEditable={!wizard.isImportFlow}
              onTextChange={wizard.setText}
              initialPage={wizard.sourcePage ?? 1}
            />
          ) : null}

          {!wizard.extracting && !wizard.extractionFailed && wizard.step === "chunking" ? (
            <div className="grid h-full min-h-0 gap-4 overflow-hidden lg:grid-cols-[380px_1fr]">
              <section className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-md border p-4">
                <div>
                  <h2 className="text-base font-medium">分片配置</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    调整参数后点击「生成预览」查看右侧结果
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">分段模式</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={[
                        "rounded-md border px-3 py-2 text-sm",
                        wizard.mode === "smart"
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/60",
                      ].join(" ")}
                      onClick={() => wizard.setMode("smart")}
                    >
                      智能分段
                    </button>
                    <button
                      type="button"
                      className={[
                        "rounded-md border px-3 py-2 text-sm",
                        wizard.mode === "advanced"
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/60",
                      ].join(" ")}
                      onClick={() => wizard.setMode("advanced")}
                    >
                      高级分段
                    </button>
                  </div>
                </div>
                {wizard.mode === "advanced" ? (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium">分段标识符</label>
                      <MultiSelect
                        value={wizard.separators}
                        onValueChange={(values) =>
                          wizard.setSeparators(values as ChunkPreviewSeparator[])
                        }
                        options={[...CHUNK_SEPARATOR_OPTIONS]}
                        placeholder="选择分段标识符"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        单片最大长度（最小 100）
                      </label>
                      <Input
                        type="number"
                        min={100}
                        max={2000}
                        step={10}
                        value={wizard.maxLengthInput}
                        onChange={(e) => wizard.handleMaxLengthInputChange(e.target.value)}
                        onBlur={wizard.handleMaxLengthBlur}
                      />
                    </div>
                    <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span>自动清洗（去重复符号 / 空格 / 空行 / Tab）</span>
                      <input
                        type="checkbox"
                        checked={wizard.trimSpaces}
                        onChange={(e) => wizard.setTrimSpaces(e.target.checked)}
                      />
                    </label>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    智能分段会按段落与句子边界自动切分，适合大多数文档。
                  </p>
                )}
                <Button
                  className="mt-auto w-full"
                  variant="primary"
                  onClick={wizard.onGenerate}
                  disabled={!wizard.canPreview}
                  loading={wizard.loading}
                >
                  生成预览
                </Button>
              </section>

              <section className="flex min-h-0 flex-col overflow-hidden rounded-md border p-4">
                <div className="mb-3 text-sm text-muted-foreground">
                  {wizard.loading ? (
                    <LoadingText className="justify-start">正在生成分片</LoadingText>
                  ) : wizard.chunks.length ? (
                    `共 ${wizard.chunks.length} 个分片`
                  ) : (
                    "调整左侧参数后生成预览"
                  )}
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                  {wizard.chunks.map((chunk) => {
                    const highlighted =
                      wizard.highlightChunkIndex !== null &&
                      chunk.index === wizard.highlightChunkIndex + 1
                    return (
                      <article
                        key={chunk.index}
                        ref={highlighted ? wizard.highlightChunkRef : undefined}
                        className={[
                          "rounded-md border p-3",
                          highlighted ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "",
                        ].join(" ")}
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>
                            分片 #{chunk.index}
                            {chunk.pageStart != null
                              ? ` · 页 ${chunk.pageStart}${
                                  chunk.pageEnd != null && chunk.pageEnd !== chunk.pageStart
                                    ? `-${chunk.pageEnd}`
                                    : ""
                                }`
                              : ""}
                            {chunk.sourceKind ? ` · ${chunk.sourceKind}` : ""}
                            {highlighted ? (
                              <span className="ml-2 text-primary">召回命中</span>
                            ) : null}
                          </span>
                          <span>{wizard.formatCharCountK(chunk.charCount)}</span>
                        </div>
                        <pre className="whitespace-pre-wrap break-words text-sm">{chunk.text}</pre>
                      </article>
                    )
                  })}
                </div>
              </section>
            </div>
          ) : null}
        </div>

        {!wizard.extracting && !wizard.extractionFailed ? (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t px-4 py-3">
            <div className="min-w-0 text-sm text-destructive">
              {wizard.error || wizard.saveError || null}
            </div>
            <div className="flex shrink-0 gap-2">
              {wizard.step !== "source" ? (
                <Button
                  variant="outline"
                  onClick={wizard.goBack}
                  disabled={wizard.loading || wizard.saving}
                >
                  上一步
                </Button>
              ) : (
                <Button variant="outline" onClick={wizard.backToList}>
                  取消
                </Button>
              )}
              <Button
                variant="primary"
                onClick={wizard.goNext}
                disabled={!wizard.canGoNext}
                loading={wizard.loading || wizard.saving}
              >
                {wizard.nextLabel}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
