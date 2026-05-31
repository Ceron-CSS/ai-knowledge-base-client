import { useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { Dialog } from "@/components/ui/dialog"
import type { KbItem } from "@/api/kb"
import { extractKbFileText, getKbItemDetail } from "@/api/kb"
import {
  useDeleteKbItem,
  useKbItems,
  useSetKbItemEnabled,
} from "@/features/kb/queries"

function formatCharCountK(value: number) {
  if (value <= 0) return "0K"
  return `${(value / 1000).toFixed(value >= 1000 ? 1 : 2)}K`
}

export function KbDetailPage() {
  const navigate = useNavigate()
  const { id = "" } = useParams()
  const items = useKbItems(id)
  const setEnabled = useSetKbItemEnabled()
  const deleteItem = useDeleteKbItem()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<KbItem | null>(null)

  const list = items.data ?? []
  const countLabel = useMemo(() => `${list.length} 个文档`, [list.length])

  async function onToggle(itemId: string, enabled: boolean) {
    await setEnabled.mutateAsync({ kbId: id, itemId, enabled: !enabled })
  }

  function confirmDelete() {
    if (!deleting) return
    deleteItem.mutate({ kbId: id, itemId: deleting.id })
    setDeleting(null)
  }

  async function onEdit(itemId: string) {
    setEditingItemId(itemId)
    try {
      const detail = await getKbItemDetail(id, itemId)
      navigate(`/kb/${id}/upload`, {
        state: {
          fileName: detail.fileName,
          text: detail.content,
          chunks: detail.chunks,
        },
      })
    } finally {
      setEditingItemId(null)
    }
  }

  async function handlePickFile(file: File | null) {
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const extracted = await extractKbFileText(id, file)
      setUploadOpen(false)
      navigate(`/kb/${id}/upload`, { state: extracted })
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "文件解析失败")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <Breadcrumb
          items={[
            { label: "知识库", href: "/kb" },
            { label: "文档列表" },
          ]}
        />
        <p className="mt-1 text-sm text-muted-foreground">
          查看文档列表，支持删除与启用/禁用
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">{countLabel}</div>
        <span className="group relative inline-flex">
          <button
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            onClick={() => setUploadOpen(true)}
          >
            上传文件
          </button>
        </span>
      </div>

      <div className="rounded-lg border bg-background">
        {items.isLoading ? (
          <div className="px-4 py-8 text-sm text-muted-foreground">
            加载中...
          </div>
        ) : items.isError ? (
          <div className="px-4 py-8 text-sm text-destructive">
            加载失败，请稍后重试
          </div>
        ) : list.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted-foreground">
            暂无文档，先上传一个文件吧
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40">
                <tr className="border-b">
                  <th className="px-3 py-2 font-medium">文件名称</th>
                  <th className="px-3 py-2 font-medium">字符数</th>
                  <th className="px-3 py-2 font-medium">分段数</th>
                  <th className="px-3 py-2 font-medium">启用状态</th>
                  <th className="px-3 py-2 font-medium">创建时间</th>
                  <th className="px-3 py-2 font-medium">更新时间</th>
                  <th className="px-3 py-2 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td
                      className="max-w-[18rem] truncate px-3 py-2"
                      title={item.fileName}
                    >
                      {item.fileName}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{formatCharCountK(item.charCount)}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {item.chunkCount}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
                          item.enabled
                            ? "bg-emerald-500/10 text-emerald-700"
                            : "bg-zinc-500/10 text-zinc-700",
                        ].join(" ")}
                      >
                        {item.enabled ? "启用" : "禁用"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">
                      {new Date(item.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted/60"
                          onClick={() => void onEdit(item.id)}
                          disabled={setEnabled.isPending || deleteItem.isPending || editingItemId === item.id}
                        >
                          {editingItemId === item.id ? "加载中..." : "编辑"}
                        </button>
                        <button
                          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted/60"
                          onClick={() => onToggle(item.id, item.enabled)}
                          disabled={
                            setEnabled.isPending || deleteItem.isPending
                          }
                        >
                          {item.enabled ? "禁用" : "启用"}
                        </button>
                        <button
                          className="rounded-md border border-destructive/40 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleting(item)}
                          disabled={
                            setEnabled.isPending || deleteItem.isPending
                          }
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          if (!uploading) setUploadOpen(open)
        }}
        title="上传文件"
        description="支持拖拽或点击选择文件支持格式：TXT、Markdown、PDF、DOC、DOCX"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".txt,.md,.markdown,.pdf,.doc,.docx,text/plain,text/markdown,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => void handlePickFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className={[
            "w-full rounded-lg border-2 border-dashed px-4 py-10 text-center transition",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/30 hover:bg-muted/40",
          ].join(" ")}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            void handlePickFile(e.dataTransfer.files?.[0] ?? null)
          }}
          disabled={uploading}
        >
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              {uploading ? "正在解析文件..." : "拖拽文件至此上传"}
            </div>
            <div className="text-sm">
              或 <span className="text-primary underline">选择文件</span>
            </div>
          </div>
        </button>
        {uploadError ? (
          <div className="mt-3 text-sm text-destructive">{uploadError}</div>
        ) : null}
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        description={deleting ? `将删除文档「${deleting.fileName}」，该操作不可恢复` : undefined}
        errorText={deleteItem.isError ? "删除失败，请重试" : null}
        confirming={deleteItem.isPending}
      />
    </div>
  )
}
