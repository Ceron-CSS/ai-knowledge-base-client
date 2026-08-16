import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { message } from "@/components/ui/message"
import { useRefetchFeishuStatus } from "@/features/feishu/hooks/useFeishuStatus"
import { requestReopenImportDialog } from "@/features/feishu/lib/reopenImportDialog"

/**
 * Handles the OAuth redirect back from Feishu (`?feishu=connected|error`).
 * The backend already redirects to the page the user initiated the scan
 * from (return_to), so this bridge only surfaces the outcome and reopens
 * the import dialog on success.
 */
export function FeishuOAuthBridge() {
  const [searchParams] = useSearchParams()
  const refetchStatus = useRefetchFeishuStatus()

  useEffect(() => {
    const outcome = searchParams.get("feishu")
    if (!outcome) return

    const reason = searchParams.get("reason")

    if (outcome === "connected") {
      // 保留 ?feishu=connected：交给 KB 页面读取后自行清理，避免时序竞态。
      requestReopenImportDialog()
      void refetchStatus()
      message.success("飞书账号已连接")
      return
    }

    // 失败/取消：没有对话框要开，直接清掉参数。
    const url = new URL(window.location.href)
    url.searchParams.delete("feishu")
    url.searchParams.delete("reason")
    window.history.replaceState(null, "", url.toString())
    message.error(reason ? `飞书授权失败：${reason}` : "飞书授权已取消")
  }, [refetchStatus, searchParams])

  return null
}
