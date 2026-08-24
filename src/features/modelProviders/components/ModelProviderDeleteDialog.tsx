import type { ModelConfig, ModelConfigLinkedAssistant } from "@/api/models"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { ModelProviderLinkedAssistantsList } from "@/features/modelProviders/components/ModelProviderLinkedAssistantsList"
import { providerLabel } from "@/features/modelProviders/lib/providerLabel"

type ModelProviderDeleteDialogProps = {
  config: ModelConfig | null
  linkedAssistants: ModelConfigLinkedAssistant[]
  confirming: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ModelProviderDeleteDialog({
  config,
  linkedAssistants,
  confirming,
  onCancel,
  onConfirm,
}: ModelProviderDeleteDialogProps) {
  const hasLinkedAssistants = linkedAssistants.length > 0

  return (
    <ConfirmDeleteDialog
      open={!!config}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title="确认删除模型提供商"
      description={
        config && !hasLinkedAssistants
          ? `将删除「${providerLabel(config.provider)}」模型提供商，此操作不可恢复`
          : undefined
      }
      confirming={confirming}
    >
      {config && hasLinkedAssistants ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            以下问答助手正在使用「{providerLabel(config.provider)}」，删除后将<b>取消发布</b>
            这些助手：
          </p>
          <ModelProviderLinkedAssistantsList assistants={linkedAssistants} />
          <p className="text-sm text-muted-foreground">确定要继续删除吗？</p>
        </div>
      ) : null}
    </ConfirmDeleteDialog>
  )
}
