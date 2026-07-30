import type { Kb, KbLinkedAssistant } from "@/api/kb"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { KbLinkedAssistantsList } from "@/features/kb/components/KbLinkedAssistantsList"

type KbDisableDialogProps = {
  kb: Kb | null
  linkedAssistants: KbLinkedAssistant[]
  confirming: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function KbDisableDialog({
  kb,
  linkedAssistants,
  confirming,
  onCancel,
  onConfirm,
}: KbDisableDialogProps) {
  return (
    <Dialog
      open={!!kb}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
      title="确认停用知识库"
    >
      {kb ? (
        <>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              以下问答助手正在关联知识库「{kb.name}」，停用后将<b>取消发布</b>这些助手：
            </p>
            <KbLinkedAssistantsList assistants={linkedAssistants} />
            <p className="text-sm text-muted-foreground">确定要继续停用吗？</p>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="dialog-cancel" size="dialog" onClick={onCancel} disabled={confirming}>
              取消
            </Button>
            <Button variant="primary" size="dialog" onClick={onConfirm} loading={confirming}>
              确认停用
            </Button>
          </div>
        </>
      ) : null}
    </Dialog>
  )
}
