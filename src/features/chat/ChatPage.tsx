import { Navigate, useSearchParams } from "react-router-dom"

export function ChatPage() {
  const [params] = useSearchParams()
  const assistantId = params.get("assistantId")

  if (assistantId) {
    return <Navigate to={`/assistants/${encodeURIComponent(assistantId)}/chat`} replace />
  }

  return (
    <div>
      <h1 className="text-lg font-semibold">问答</h1>
      <p className="mt-2 text-sm text-muted-foreground">TODO: 通用问答（不关联问答助手）</p>
    </div>
  )
}

