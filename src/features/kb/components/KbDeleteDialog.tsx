import type { Kb, KbLinkedAssistant } from "@/api/kb"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { KbLinkedAssistantsList } from "@/features/kb/components/KbLinkedAssistantsList"

type KbDeleteDialogProps = {
  kb: Kb | null
  linkedAssistants: KbLinkedAssistant[]
  checkingLinked: boolean
  linkedCheckError: string | null
  confirming: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function KbDeleteDialog({
  kb,
  linkedAssistants,
  checkingLinked,
  linkedCheckError,
  confirming,
  onCancel,
  onConfirm,
}: KbDeleteDialogProps) {
  const confirmDisabled = confirming || checkingLinked || !!linkedCheckError

  return (
    <Dialog
      open={!!kb}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
      title="确认删除知识库"
    >
      {kb ? (
        <>
          <div className="space-y-3">
            {checkingLinked ? (
              <p className="text-sm text-muted-foreground">正在检查关联助手...</p>
            ) : linkedCheckError ? (
              <p className="text-sm text-destructive">{linkedCheckError}</p>
            ) : linkedAssistants.length ? (
              <>
                <p className="text-sm text-muted-foreground">
                  以下问答助手正在关联知识库「{kb.name}」，删除后将<b>取消发布</b>这些助手：
                </p>
                <KbLinkedAssistantsList assistants={linkedAssistants} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                将删除知识库「{kb.name}」，该操作不可恢复，且会同时删除其下的知识项。
              </p>
            )}
            <p className="text-sm text-muted-foreground">确定要继续删除吗？</p>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="dialog-cancel" size="dialog" onClick={onCancel} disabled={confirming}>
              取消
            </Button>
            <Button
              variant="dialog-danger"
              size="dialog"
              onClick={onConfirm}
              loading={confirming}
              disabled={confirmDisabled}
            >
              确认删除
            </Button>
          </div>
        </>
      ) : null}
    </Dialog>
  )
}
