import { useState } from "react"
import type { EvalQuery } from "@/api/evals"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
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
  }) => void
}

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
  const labeling = useChunkLabeling(initial?.relevantChunkIds ?? [], initial?.question ?? "")

  function handleSubmit() {
    const q = question.trim()
    if (!q) return
    onSubmit({
      question: q,
      referenceAnswer: referenceAnswer.trim() || null,
      relevantChunkIds: labeling.selectedIds,
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
