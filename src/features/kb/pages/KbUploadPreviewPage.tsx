import { useState } from "react"
import type { LucideIcon } from "lucide-react"
import { CheckCircle2, Layers, ListTree, Network, Ruler } from "lucide-react"
import { useParams } from "react-router-dom"
import type { ChunkPreviewSeparator } from "@/api/kb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingText } from "@/components/ui/loading-text"
import { MultiSelect } from "@/components/ui/multi-select"
import { Page, PageBody, PageHeader } from "@/components/ui/page-header"
import { Switch } from "@/components/ui/switch"
import { KbSourcePreview } from "@/features/kb/components/KbSourcePreview"
import {
  CHUNK_MODE_OPTIONS,
  CHUNK_SEPARATOR_OPTIONS,
  type VisibleChunkPreviewMode,
} from "@/features/kb/constants/chunkPreview"
import { useKb } from "@/features/kb/hooks/queries"
import { useKbUploadPreview } from "@/features/kb/hooks/useKbUploadPreview"
import { formatShanghaiDateTime } from "@/lib/dateTime"

const CHUNK_MODE_ICONS: Record<VisibleChunkPreviewMode, LucideIcon> = {
  recursive: Layers,
  token: Ruler,
  structure: ListTree,
  parent_child: Network,
}

function estimatePreviewTokenCount(text: string) {
  return text.match(/[\u4e00-\u9fff]|[A-Za-z0-9_]+|[^\s\u4e00-\u9fffA-Za-z0-9_]/g)?.length ?? 0
}

export function KbUploadPreviewPage() {
  const { id = "" } = useParams()
  const wizard = useKbUploadPreview({ kbId: id })
  const kb = useKb(id)
  const [sourceMarkdownMode, setSourceMarkdownMode] = useState<"preview" | "edit">("preview")
  const lowerFileName = wizard.fileName.toLowerCase()
  const sourceIsEditableMarkdown =
    !wizard.isImportFlow && (lowerFileName.endsWith(".md") || lowerFileName.endsWith(".markdown"))
  const sourceTextEditable =
    !wizard.isImportFlow && (!sourceIsEditableMarkdown || sourceMarkdownMode === "edit")
  const chunkSizeCounts = wizard.chunks.map((chunk) =>
    wizard.mode === "token" ? estimatePreviewTokenCount(chunk.text) : chunk.charCount,
  )
  const averageChunkLength = chunkSizeCounts.length
    ? Math.round(chunkSizeCounts.reduce((sum, count) => sum + count, 0) / chunkSizeCounts.length)
    : 0
  const maxChunkLength = chunkSizeCounts.length ? Math.max(...chunkSizeCounts) : 0
  const lengthLabel = wizard.mode === "token" ? "目标 Token 长度" : "目标分片长度"
  const previewSizeUnit = wizard.mode === "token" ? "Token" : "字符"
  const showStructureOptions = wizard.mode === "structure" || wizard.mode === "parent_child"
  const uploadBreadcrumbLabel = wizard.fileName ? `导入文档-${wizard.fileName}` : "导入文档"

  return (
    <Page fill>
      <PageHeader
        items={[
          { label: kb.data?.name ?? "加载中…", href: "/kb" },
          { label: "文档列表", href: `/kb/${id}` },
          { label: uploadBreadcrumbLabel },
        ]}
        description="先确认原文，再配置分片并预览，最后提交索引"
      >
        {wizard.expiresAt ? (
          <p className="mt-1 text-xs text-muted-foreground">
            草稿到期：{formatShanghaiDateTime(wizard.expiresAt)}
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
      </PageHeader>

      <PageBody className="flex min-h-0 flex-col overflow-hidden pt-4">
      <ol className="mb-4 flex flex-wrap gap-2">
        {wizard.steps.map((item, index) => {
          const active = item.id === wizard.step
          const done = index < wizard.stepIndex
          const canReturnToStep = done && item.id === "source" && !wizard.loading && !wizard.saving
          const content = (
            <>
              <span className="mr-1.5 tabular-nums text-muted-foreground">{index + 1}.</span>
              {item.label}
            </>
          )
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
              {canReturnToStep ? (
                <button
                  type="button"
                  className="inline-flex items-center rounded-sm text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={wizard.goBack}
                >
                  {content}
                </button>
              ) : (
                content
              )}
            </li>
          )
        })}
      </ol>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
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
            <div className="flex h-full min-h-0 flex-col">
              {sourceIsEditableMarkdown ? (
                <div className="mb-3 flex shrink-0 justify-end gap-2">
                  <Button
                    variant={sourceMarkdownMode === "preview" ? "primary" : "tint"}
                    size="sm"
                    onClick={() => setSourceMarkdownMode("preview")}
                  >
                    预览
                  </Button>
                  <Button
                    variant={sourceMarkdownMode === "edit" ? "primary" : "tint"}
                    size="sm"
                    onClick={() => setSourceMarkdownMode("edit")}
                  >
                    编辑原文
                  </Button>
                </div>
              ) : null}
              <div className="min-h-0 flex-1 overflow-hidden">
                <KbSourcePreview
                  kbId={id}
                  itemId={wizard.ingestItemId}
                  fileName={wizard.fileName}
                  text={wizard.text}
                  textEditable={sourceTextEditable}
                  onTextChange={wizard.setText}
                  initialPage={wizard.sourcePage ?? 1}
                />
              </div>
            </div>
          ) : null}

          {!wizard.extracting && !wizard.extractionFailed && wizard.step === "chunking" ? (
            <div className="grid h-full min-h-0 gap-4 overflow-hidden lg:grid-cols-[420px_minmax(0,1fr)] xl:grid-cols-[440px_minmax(0,1fr)]">
              <section className="stable-scrollbar flex min-h-0 flex-col gap-4 overflow-y-auto rounded-md border p-4">
                <div>
                  <h2 className="text-base font-medium">分片配置</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    选择策略并调整参数，右侧实时展示可入库的分片结果。
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="grid gap-2">
                    {CHUNK_MODE_OPTIONS.map((option) => {
                      const active = option.value === wizard.mode
                      const Icon = CHUNK_MODE_ICONS[option.value]
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={[
                            "group flex min-h-[74px] items-start gap-3 rounded-md border p-3 text-left transition-colors",
                            active
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "hover:border-primary/40 hover:bg-muted/50",
                          ].join(" ")}
                          onClick={() => wizard.setMode(option.value)}
                        >
                          <span
                            className={[
                              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border",
                              active
                                ? "border-primary/30 bg-primary text-primary-foreground"
                                : "bg-card text-muted-foreground",
                            ].join(" ")}
                          >
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium">{option.label}</span>
                              {active ? <CheckCircle2 className="size-4 text-primary" /> : null}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                              {option.description}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                {wizard.mode === "parent_child" ? (
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium">父级窗口长度</span>
                      <Input
                        type="number"
                        min={100}
                        max={4000}
                        step={50}
                        value={wizard.parentMaxLengthInput}
                        onChange={(e) => wizard.handleParentMaxLengthInputChange(e.target.value)}
                        onBlur={wizard.handleParentMaxLengthBlur}
                      />
                    </label>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium">{lengthLabel}</span>
                      <Input
                        type="number"
                        min={100}
                        max={2000}
                        step={10}
                        value={wizard.maxLengthInput}
                        onChange={(e) => wizard.handleMaxLengthInputChange(e.target.value)}
                        onBlur={wizard.handleMaxLengthBlur}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium">重叠长度</span>
                      <Input
                        type="number"
                        min={0}
                        max={1999}
                        step={10}
                        value={wizard.overlapLengthInput}
                        onChange={(e) => wizard.handleOverlapLengthInputChange(e.target.value)}
                        onBlur={wizard.handleOverlapLengthBlur}
                      />
                    </label>
                  </div>

                  {showStructureOptions ? (
                    <div>
                      <label className="mb-1.5 inline-flex items-center gap-1 text-sm font-medium">
                        结构标识符
                        <span className="text-destructive" aria-hidden="true">
                          *
                        </span>
                      </label>
                      <MultiSelect
                        value={wizard.separators}
                        onValueChange={(values) =>
                          wizard.setSeparators(values as ChunkPreviewSeparator[])
                        }
                        options={[...CHUNK_SEPARATOR_OPTIONS]}
                        placeholder="选择标题、编号或列表边界"
                      />
                    </div>
                  ) : null}

                  <label className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block font-medium">自动清洗文本</span>
                      <span className="block text-xs text-muted-foreground">
                        去除重复空格、空行和 Tab，减少无效字符进入索引。
                      </span>
                    </span>
                    <Switch
                      checked={wizard.trimSpaces}
                      onCheckedChange={wizard.setTrimSpaces}
                      size="sm"
                    />
                  </label>
                </div>

                <div className="rounded-md border p-3 text-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-medium">预览概览</span>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-muted/50 px-2 py-2">
                      <dt className="text-xs text-muted-foreground">分片数</dt>
                      <dd className="mt-1 font-medium tabular-nums">{wizard.chunks.length}</dd>
                    </div>
                    <div className="rounded-md bg-muted/50 px-2 py-2">
                      <dt className="text-xs text-muted-foreground">平均{previewSizeUnit}</dt>
                      <dd className="mt-1 font-medium tabular-nums">{averageChunkLength}</dd>
                    </div>
                    <div className="rounded-md bg-muted/50 px-2 py-2">
                      <dt className="text-xs text-muted-foreground">最大{previewSizeUnit}</dt>
                      <dd className="mt-1 font-medium tabular-nums">{maxChunkLength}</dd>
                    </div>
                  </dl>
                </div>

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
                <div className="stable-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                  {wizard.chunks.map((chunk) => {
                    const highlighted =
                      wizard.highlightChunkIndex !== null &&
                      chunk.index === wizard.highlightChunkIndex + 1
                    const chunkSize =
                      wizard.mode === "token"
                        ? `${estimatePreviewTokenCount(chunk.text)} Token`
                        : wizard.formatCharCountK(chunk.charCount)
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
                          <span>{chunkSize}</span>
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
                  variant="dialog-cancel"
                  size="lg"
                  onClick={wizard.goBack}
                  disabled={wizard.loading || wizard.saving}
                >
                  上一步
                </Button>
              ) : (
                <Button variant="dialog-cancel" size="lg" onClick={wizard.backToList}>
                  取消
                </Button>
              )}
              <Button
                variant="primary"
                size="lg"
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
      </PageBody>
    </Page>
  )
}
