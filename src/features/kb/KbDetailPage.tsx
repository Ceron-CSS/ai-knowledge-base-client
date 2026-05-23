import { useParams } from "react-router-dom"

export function KbDetailPage() {
  const { id } = useParams()

  return (
    <div className="space-y-2">
      <h1 className="text-lg font-semibold">知识库管理</h1>
      <p className="text-sm text-muted-foreground">TODO: 知识库详情页（占位）。</p>
      <p className="text-sm text-muted-foreground">kbId: {id}</p>
    </div>
  )
}

