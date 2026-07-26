import { useCallback, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Pencil, Trash2 } from "lucide-react"
import type { KbItem } from "@/api/kb"
import { extractKbFileText, getKbItemDetail } from "@/api/kb"
import { Button } from "@/components/ui/button"
import type { DataTableColumn } from "@/components/ui/data-table"
import { Switch } from "@/components/ui/switch"
import { useDeleteKbItem, useKbItems, useSetKbItemEnabled } from "@/features/kb/hooks/queries"
import { formatCharCountK } from "@/features/kb/lib/formatCharCountK"

type UseKbDetailPageOptions = {
  kbId: string
}

export function useKbDetailPage({ kbId }: UseKbDetailPageOptions) {
  const navigate = useNavigate()
  const items = useKbItems(kbId)
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

  const onToggle = useCallback(
    async (itemId: string, enabled: boolean) => {
      await setEnabled.mutateAsync({ kbId, itemId, enabled: !enabled })
    },
    [kbId, setEnabled],
  )

  function confirmDelete() {
    if (!deleting) return
    deleteItem.mutate({ kbId, itemId: deleting.id })
    setDeleting(null)
  }

  const onEdit = useCallback(
    async (itemId: string) => {
      setEditingItemId(itemId)
      try {
        const detail = await getKbItemDetail(kbId, itemId)
        navigate(`/kb/${kbId}/upload`, {
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
    },
    [kbId, navigate],
  )

  async function handlePickFile(file: File | null) {
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const extracted = await extractKbFileText(kbId, file)
      setUploadOpen(false)
      navigate(`/kb/${kbId}/upload`, { state: extracted })
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "文件解析失败")
    } finally {
      setUploading(false)
    }
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault()
    if (!uploading) setDragOver(true)
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
    [deleteItem.isPending, editingItemId, onEdit, onToggle, setEnabled.isPending],
  )

  return {
    items,
    list,
    countLabel,
    columns,
    uploadOpen,
    setUploadOpen,
    uploading,
    uploadError,
    dragOver,
    setDragOver,
    fileInputRef,
    deleting,
    setDeleting,
    deleteItem,
    confirmDelete,
    handlePickFile,
    handleDragOver,
  }
}
