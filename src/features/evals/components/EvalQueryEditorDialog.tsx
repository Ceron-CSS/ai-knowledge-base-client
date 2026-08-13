import { useState } from "react"
import type { EvalQuery } from "@/api/evals"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ChunkLabelingPanel } from "@/features/evals/components/ChunkLabelingPanel"
import { useChunkLabeling } from "@/features/evals/hooks/useChunkLabeling"

export type EvalQueryEditorMode = "create" | "edit"

type EvalQueryEditorDialogProps = {
  open: boolean
  mode: EvalQueryEditorMode
  initial?: EvalQuery | null
  isSaving: boolean
  hasError: boolean
  errorText?: string | null
  onCancel: () => void
  onSubmit: (body: {
    question: string
    referenceAnswer: string | null
    relevantChunkIds: string[]
    questionType: string | null
    shouldAbstain: boolean
  }) => void
}

const QUESTION_TYPE_OPTIONS = [
  { value: "", label: "未分类" },
  { value: "single_fact", label: "单事实定位" },
  { value: "paraphrase", label: "同义表达" },
  { value: "multi_condition", label: "多条件问题" },
  { value: "cross_chunk", label: "跨 Chunk 问题" },
  { value: "similar_distractor", label: "相似内容干扰" },
  { value: "insufficient_evidence", label: "证据不足" },
  { value: "small_talk", label: "简单闲聊" },
  { value: "online_failure", label: "线上失败回流" },
]

export function EvalQueryEditorDialog({
  open,
  mode,
  initial,
  isSaving,
  hasError,
  errorText,
  onCancel,
  onSubmit,
}: EvalQueryEditorDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
      title={mode === "create" ? "新建实验问题" : "编辑实验问题"}
      description="填写问题，并从召回候选中标注相关 Chunk"
      contentClassName="max-w-4xl"
      bodyClassName="max-h-[min(70vh,720px)] overflow-y-auto pr-1"
    >
      {open ? (
        <EvalQueryEditorForm
          key={initial?.id ?? "new-query"}
          mode={mode}
          initial={initial}
          isSaving={isSaving}
          hasError={hasError}
          errorText={errorText}
          onCancel={onCancel}
          onSubmit={onSubmit}
        />
      ) : null}
    </Dialog>
  )
}

function EvalQueryEditorForm({
  mode,
  initial,
  isSaving,
  hasError,
  errorText,
  onCancel,
  onSubmit,
}: Omit<EvalQueryEditorDialogProps, "open">) {
  const [question, setQuestion] = useState(initial?.question ?? "")
  const [referenceAnswer, setReferenceAnswer] = useState(initial?.referenceAnswer ?? "")
  const [questionType, setQuestionType] = useState(initial?.questionType ?? "")
  const [shouldAbstain, setShouldAbstain] = useState(initial?.shouldAbstain ?? false)
  const labeling = useChunkLabeling(initial?.relevantChunkIds ?? [], initial?.question ?? "")

  function handleSubmit() {
    const q = question.trim()
    if (!q) return
    onSubmit({
      question: q,
      referenceAnswer: referenceAnswer.trim() || null,
      relevantChunkIds: labeling.selectedIds,
      questionType: questionType || null,
      shouldAbstain,
    })
  }

  return (
    <>
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            问题 <span className="text-destructive">*</span>
          </label>
          <Textarea
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="用户会怎么问？"
            disabled={isSaving}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">参考答案（可选）</label>
          <Textarea
            rows={3}
            value={referenceAnswer}
            onChange={(e) => setReferenceAnswer(e.target.value)}
            placeholder="端到端实验时可填写参考答案"
            disabled={isSaving}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <label className="mb-1.5 block text-sm font-medium">问题类型</label>
            <Select
              value={questionType}
              onValueChange={setQuestionType}
              options={QUESTION_TYPE_OPTIONS}
              disabled={isSaving}
            />
          </div>
          <label className="flex items-center gap-2 self-end rounded-md border border-border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={shouldAbstain}
              onChange={(event) => setShouldAbstain(event.target.checked)}
              disabled={isSaving}
            />
            应拒答
          </label>
        </div>

        <ChunkLabelingPanel
          labeling={labeling}
          onUseQuestionAsQuery={() => labeling.setQuery(question.trim())}
        />
      </div>

      {hasError ? (
        <div className="mt-3 text-sm text-destructive">{errorText || "保存失败，请稍后重试"}</div>
      ) : null}

      <div className="mt-4 flex justify-end gap-3">
        <Button variant="dialog-cancel" size="dialog" onClick={onCancel} disabled={isSaving}>
          取消
        </Button>
        <Button
          variant="primary"
          size="dialog"
          onClick={handleSubmit}
          disabled={!question.trim()}
          loading={isSaving}
        >
          {mode === "edit" ? "保存" : "创建"}
        </Button>
      </div>
    </>
  )
}
