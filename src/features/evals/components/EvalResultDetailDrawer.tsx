import type { EvalRunResult } from "@/api/evals"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { ChunkRefList } from "@/features/evals/components/ChunkRefList"
import { useChunkHits } from "@/features/evals/hooks/useChunkHits"
import {
  evalRunStatusLabel,
  formatLatencyMs,
  formatMetricNumber,
} from "@/features/evals/lib/labels"

type EvalResultDetailDrawerProps = {
  open: boolean
  result: EvalRunResult | null
  question?: string
  referenceAnswer?: string | null
  onClose: () => void
  onOpenTrace?: (agentRunId: string) => void
  onOpenCitation?: (citation: {
    kbId: string
    itemId: string
    chunkIndex?: number
    chunkId?: string
    pageStart?: number
  }) => void
}

export function EvalResultDetailDrawer({
  open,
  result,
  question,
  referenceAnswer,
  onClose,
  onOpenTrace,
  onOpenCitation,
}: EvalResultDetailDrawerProps) {
  const chunkHits = useChunkHits(
    result ? [...result.retrievedChunkIds, ...result.relevantChunkIds] : [],
  )
  const hitByChunkId = chunkHits.hitByChunkId

  if (!result) {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && onClose()} title="问题结果">
        <div className="text-sm text-muted-foreground">未选择结果</div>
      </Dialog>
    )
  }

  const judge = (key: string) => {
    const value = result.metrics[key]
    if (!value || typeof value !== "object") return null
    const obj = value as { score?: number; explanation?: string }
    return obj
  }

  const faithfulness = judge("faithfulness")
  const relevancy = judge("answerRelevancy")
  const citation = judge("citationSupport")
  const decisionSummary =
    result.metrics.decisionSummary && typeof result.metrics.decisionSummary === "object"
      ? (result.metrics.decisionSummary as Record<string, unknown>)
      : null
  const citations = result.citations.filter(isOpenableCitation)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title="问题结果详情"
      contentClassName="max-w-3xl"
      bodyClassName="max-h-[min(70vh,720px)] overflow-y-auto pr-1"
      footer={
        <>
          {result.agentRunId && onOpenTrace ? (
            <Button variant="outline" size="dialog" onClick={() => onOpenTrace(result.agentRunId!)}>
              打开 Agent Trace
            </Button>
          ) : null}
          <Button variant="primary" size="dialog" onClick={onClose}>
            关闭
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <Field label="状态" value={evalRunStatusLabel(result.status)} />
        <Field label="问题" value={question || result.queryId} />
        <Field label="参考答案" value={referenceAnswer || "-"} />
        <Field
          label="检索指标"
          value={`Recall ${formatMetricNumber(result.metrics.recallAtK)} · Precision ${formatMetricNumber(result.metrics.precisionAtK)} · Hit ${formatMetricNumber(result.metrics.hitAtK, 0)} · MRR ${formatMetricNumber(result.metrics.mrrAtK)} · NDCG ${formatMetricNumber(result.metrics.ndcgAtK)} · ${formatLatencyMs(result.durationMs ?? result.metrics.latencyMs)}`}
        />
        <Field
          label="答案状态"
          value={result.generatedAnswer ? "已生成答案；检索指标只衡量是否命中人工标注 Chunk。" : "未生成答案"}
        />
        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">召回 Chunk</div>
          <ChunkRefList
            chunkIds={result.retrievedChunkIds}
            hitByChunkId={hitByChunkId}
            loading={chunkHits.isFetching}
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">相关标签</div>
          <ChunkRefList
            chunkIds={result.relevantChunkIds}
            hitByChunkId={hitByChunkId}
            loading={chunkHits.isFetching}
          />
        </div>
        {citations.length ? (
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">引用原文</div>
            <div className="space-y-2">
              {citations.map((citation, index) => (
                <div
                  key={`${citation.itemId}-${citation.chunkIndex ?? index}-${index}`}
                  className="rounded-md border bg-muted/20 p-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {index + 1}. {citation.fileName || citation.itemId}
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {citation.snippet || "无引用摘要"}
                      </div>
                    </div>
                    {onOpenCitation ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onOpenCitation({
                            kbId: citation.kbId,
                            itemId: citation.itemId,
                            chunkIndex: citation.chunkIndex,
                            chunkId: citation.chunkId,
                            pageStart: citation.pageStart,
                          })
                        }
                      >
                        打开原文
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <Field label="生成答案" value={result.generatedAnswer || "-"} pre />
        {decisionSummary ? (
          <Field
            label="Agent 决策摘要"
            value={[
              `模式 ${String(decisionSummary.effectiveExecutionMode ?? "-")}`,
              `检索 ${Array.isArray(decisionSummary.selectedModes) ? decisionSummary.selectedModes.join(" → ") || "-" : "-"}`,
              `topK ${String(decisionSummary.initialTopK ?? "-")} → ${String(decisionSummary.finalTopK ?? "-")}`,
              `轮次 ${String(decisionSummary.retrievalPasses ?? "-")}`,
              `rerank ${decisionSummary.rerankUsed ? "是" : "否"}`,
              `扩上下文 ${decisionSummary.contextExpanded ? "是" : "否"}`,
              `停止 ${String(decisionSummary.stopReason ?? "-")}`,
            ].join(" · ")}
          />
        ) : null}
        {faithfulness ? (
          <Field
            label="Faithfulness（模型评审）"
            value={`分数 ${formatMetricNumber(faithfulness.score)} · ${faithfulness.explanation || ""}`}
          />
        ) : null}
        {relevancy ? (
          <Field
            label="Answer Relevancy（模型评审）"
            value={`分数 ${formatMetricNumber(relevancy.score)} · ${relevancy.explanation || ""}`}
          />
        ) : null}
        {citation ? (
          <Field
            label="Citation Support"
            value={`分数 ${formatMetricNumber(citation.score)} · ${citation.explanation || ""}`}
          />
        ) : null}
        {result.error ? <Field label="错误" value={result.error} /> : null}
      </div>
    </Dialog>
  )
}

type OpenableCitation = {
  kbId: string
  itemId: string
  fileName?: string
  snippet?: string
  chunkIndex?: number
  chunkId?: string
  pageStart?: number
}

function isOpenableCitation(value: Record<string, unknown>): value is OpenableCitation {
  return (
    typeof value.kbId === "string" &&
    typeof value.itemId === "string" &&
    (value.fileName === undefined || typeof value.fileName === "string") &&
    (value.snippet === undefined || typeof value.snippet === "string") &&
    (value.chunkIndex === undefined || typeof value.chunkIndex === "number") &&
    (value.chunkId === undefined || typeof value.chunkId === "string") &&
    (value.pageStart === undefined || typeof value.pageStart === "number")
  )
}

function Field({
  label,
  value,
  pre,
}: {
  label: string
  value: string
  pre?: boolean
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      {pre ? (
        <pre className="whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 text-sm">{value}</pre>
      ) : (
        <div className="whitespace-pre-wrap break-words">{value}</div>
      )}
    </div>
  )
}
