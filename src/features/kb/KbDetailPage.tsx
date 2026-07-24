import { useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { LoaderCircle, Pencil, Trash2 } from "lucide-react"
import type { KbItem } from "@/api/kb"
import { extractKbFileText, getKbItemDetail } from "@/api/kb"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { Dialog } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { useDeleteKbItem, useKbItems, useSetKbItemEnabled } from "@/features/kb/queries"

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
          itemId,
          fileName: detail.fileName,
          text: detail.content,
          chunks: detail.chunks,
          chunkConfig: detail.chunkConfig,
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

  const columns = useMemo<Array<DataTableColumn<KbItem>>>(
    () => [
      {
        key: "fileName",
        header: "文件名称",
        className: "w-[22%]",
        cellClassName: "max-w-[18rem] truncate",
        render: (item) => <span title={item.fileName}>{item.fileName}</span>,
      },
      {
        key: "charCount",
        header: "字符数",
        className: "w-[9%]",
        cellClassName: "tabular-nums",
        render: (item) => formatCharCountK(item.charCount),
      },
      {
        key: "chunkCount",
        header: "分段数",
        className: "w-[9%]",
        cellClassName: "tabular-nums",
        render: (item) => item.chunkCount,
      },
      {
        key: "enabled",
        header: "启用状态",
        className: "w-[10%]",
        render: (item) => (
          <Switch
            checked={item.enabled}
            size="sm"
            disabled={setEnabled.isPending || deleteItem.isPending}
            aria-label={item.enabled ? "禁用文档" : "启用文档"}
            title={item.enabled ? "禁用" : "启用"}
            onCheckedChange={() => void onToggle(item.id, item.enabled)}
          />
        ),
      },
      {
        key: "createdAt",
        header: "创建时间",
        className: "w-[15%]",
        cellClassName: "text-muted-foreground tabular-nums",
        render: (item) => new Date(item.createdAt).toLocaleString(),
      },
      {
        key: "updatedAt",
        header: "更新时间",
        className: "w-[15%]",
        cellClassName: "text-muted-foreground tabular-nums",
        render: (item) => new Date(item.updatedAt).toLocaleString(),
      },
      {
        key: "actions",
        header: "操作",
        className: "w-[10%] text-center",
        cellClassName: "text-center",
        render: (item) => (
          <div className="inline-flex items-center justify-center gap-0.5 whitespace-nowrap">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void onEdit(item.id)}
              disabled={setEnabled.isPending || deleteItem.isPending || editingItemId === item.id}
              loading={editingItemId === item.id}
              title="编辑"
              aria-label="编辑"
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setDeleting(item)}
              disabled={setEnabled.isPending || deleteItem.isPending}
              title="删除"
              aria-label="删除"
            >
              <Trash2 />
            </Button>
          </div>
        ),
      },
    ],
    [deleteItem.isPending, editingItemId, setEnabled.isPending],
  )

  return (
    <div className="space-y-2">
      <div>
        <Breadcrumb
          items={[
            { label: "知识库", href: "/kb" },
            { label: "文档列表" },
          ]}
        />
        <p className="mt-1 text-sm text-muted-foreground">查看文档列表，支持删除与启用/禁用</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">{countLabel}</div>
        <span className="group relative inline-flex">
          <Button size="lg" onClick={() => setUploadOpen(true)}>
            上传文件
          </Button>
        </span>
      </div>

      <DataTable
        columns={columns}
        data={list}
        getRowKey={(item) => item.id}
        loading={items.isLoading}
        error={items.isError}
      />

      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          if (!uploading) setUploadOpen(open)
        }}
        title="上传文件"
        description="支持拖拽或点击选择文件。支持格式：TXT、Markdown、PDF、DOC、DOCX"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".txt,.md,.markdown,.pdf,.doc,.docx,text/plain,text/markdown,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => void handlePickFile(e.target.files?.[0] ?? null)}
        />
        <div className="relative">
          <button
            type="button"
            className={[
              "w-full rounded-lg border-2 border-dashed px-4 py-10 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:bg-muted/40",
            ].join(" ")}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              if (!uploading) setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              if (!uploading) void handlePickFile(e.dataTransfer.files?.[0] ?? null)
            }}
            disabled={uploading}
          >
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {uploading ? "正在解析文件" : "拖拽文件至此上传"}
              </div>
              <div className="text-sm">
                或 <span className="text-primary underline">选择文件</span>
              </div>
            </div>
          </button>
          {uploading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg border bg-background/85 text-sm text-muted-foreground backdrop-blur-sm">
              <LoaderCircle className="mb-3 h-7 w-7 animate-spin text-primary" />
              <span>正在上传并解析文件</span>
            </div>
          ) : null}
        </div>
        {uploadError ? <div className="mt-3 text-sm text-destructive">{uploadError}</div> : null}
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
