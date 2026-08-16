import { useEffect } from "react"
import { LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { message } from "@/components/ui/message"
import { FeishuDocPicker } from "@/features/feishu/components/FeishuDocPicker"
import { FeishuQrLogin } from "@/features/feishu/components/FeishuQrLogin"
import { useFeishuDocPicker } from "@/features/feishu/hooks/useFeishuDocPicker"
import {
  useDisconnectFeishu,
  useFeishuStatus,
} from "@/features/feishu/hooks/useFeishuStatus"

type FeishuImportDialogProps = {
  kbId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FeishuImportDialog({
  kbId,
  open,
  onOpenChange,
}: FeishuImportDialogProps) {
  const statusQuery = useFeishuStatus()
  const picker = useFeishuDocPicker(kbId)
  const disconnect = useDisconnectFeishu()

  const returnTo = window.location.pathname + window.location.search

  useEffect(() => {
    if (open) {
      // 扫码跳转回页面后，对话框重新打开时刷新连接状态。
      void statusQuery.refetch()
    }
  }, [open, statusQuery])

  const connected = statusQuery.data?.connected ?? false

  const onDisconnect = async () => {
    try {
      await disconnect.mutateAsync()
      message.success("已解绑飞书账号")
    } catch (error) {
      message.error(error instanceof Error ? error.message : "解绑失败")
    }
  }

  const handleQrError = (text: string) => {
    message.error(text)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="从飞书导入"
      description="扫码授权后选择要导入的文档"
    >
      <div className="space-y-3">
        {statusQuery.isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <LoaderCircle className="h-6 w-6 animate-spin" />
          </div>
        ) : connected ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                已连接：
                <span className="font-medium">
                  {statusQuery.data?.user?.name ?? "飞书账号"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void onDisconnect()}
                disabled={disconnect.isPending}
              >
                解绑
              </Button>
            </div>
            <FeishuDocPicker state={picker} />
          </>
        ) : (
          <FeishuQrLogin onError={handleQrError} returnTo={returnTo} />
        )}
      </div>
    </Dialog>
  )
}
