import type { Kb, KbLinkedAssistant } from "@/api/kb"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { KbLinkedAssistantsList } from "@/features/kb/components/KbLinkedAssistantsList"

type KbDeleteDialogProps = {
  kb: Kb | null
  linkedAssistants: KbLinkedAssistant[]
  confirming: boolean
  hasError: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function KbDeleteDialog({
  kb,
  linkedAssistants,
  confirming,
  hasError,
  onCancel,
  onConfirm,
}: KbDeleteDialogProps) {
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
            {linkedAssistants.length ? (
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
            {hasError ? <div className="text-sm text-destructive">删除失败，请重试</div> : null}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="lg" onClick={onCancel} disabled={confirming}>
              取消
            </Button>
            <Button variant="destructive" size="lg" onClick={onConfirm} loading={confirming}>
              确认删除
            </Button>
          </div>
        </>
      ) : null}
    </Dialog>
  )
}
