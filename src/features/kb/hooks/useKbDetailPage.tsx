import { useCallback, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Pencil, RotateCcw, Trash2 } from "lucide-react"
import type { KbItem } from "@/api/kb"
import { getKbItemDetail, importKbItem } from "@/api/kb"
import { DEFAULT_PAGE_SIZE } from "@/api/listQuery"
import { Button } from "@/components/ui/button"
import type { DataTableColumn } from "@/components/ui/data-table"
import { message } from "@/components/ui/message"
import { Switch } from "@/components/ui/switch"
import {
  useDeleteKbItem,
  useKbItems,
  useRetryKbItemExtraction,
  useRetryKbItemIndexing,
  useSetKbItemEnabled,
} from "@/features/kb/hooks/queries"
import { formatCharCountK } from "@/features/kb/lib/formatCharCountK"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"

const STATUS_LABELS: Record<string, string> = {
  extracting: "抽取中",
  draft: "待确认",
  indexing: "索引中",
  active: "可用",
  extraction_failed: "抽取失败",
  indexing_failed: "索引失败",
  disabled: "已禁用",
}

type UseKbDetailPageOptions = {
  kbId: string
}

export function useKbDetailPage({ kbId }: UseKbDetailPageOptions) {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query, 250)
  const [page, setPage] = useState(1)
  const [pageQuery, setPageQuery] = useState(debouncedQuery)
  if (pageQuery !== debouncedQuery) {
    setPageQuery(debouncedQuery)
    setPage(1)
  }

  const itemParams = useMemo(
    () => ({
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      ...(debouncedQuery.trim() ? { q: debouncedQuery.trim() } : {}),
      sortBy: "createdAt" as const,
      sortDir: "desc" as const,
    }),
    [page, debouncedQuery],
  )
  const items = useKbItems(kbId, itemParams)
  const setEnabled = useSetKbItemEnabled()
  const deleteItem = useDeleteKbItem()
  const retryExtraction = useRetryKbItemExtraction()
  const retryIndexing = useRetryKbItemIndexing()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [statusItem, setStatusItem] = useState<KbItem | null>(null)
  const [deleting, setDeleting] = useState<KbItem | null>(null)
  const [retryingItemId, setRetryingItemId] = useState<string | null>(null)

  const list = items.data?.items ?? []
  const total = items.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE))
  if (items.data && page > totalPages) {
    setPage(totalPages)
  }
  const countLabel = useMemo(() => {
    const q = debouncedQuery.trim()
    if (q) return `${list.length}/${total} 个文档`
    return `${total} 个文档`
  }, [list.length, total, debouncedQuery])

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

  const openImportWizard = useCallback(
    (item: KbItem, fileName?: string) => {
      navigate(`/kb/${kbId}/upload`, {
        state: {
          mode: "import",
          ingestItemId: item.id,
          fileName: fileName ?? item.fileName,
        },
      })
    },
    [kbId, navigate],
  )

  const onEdit = useCallback(
    async (itemId: string) => {
      setEditingItemId(itemId)
      try {
        const detail = await getKbItemDetail(kbId, itemId)
        if (detail.hasOriginalFile) {
          navigate(`/kb/${kbId}/upload`, {
            state: {
              mode: "import",
              ingestItemId: itemId,
              fileName: detail.fileName,
              chunkConfig: detail.chunkConfig,
            },
          })
          return
        }
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

  const onRetry = useCallback(
    async (item: KbItem) => {
      setRetryingItemId(item.id)
      try {
        if (item.status === "extraction_failed") {
          await retryExtraction.mutateAsync({ kbId, itemId: item.id })
          message.success("已重新排队抽取")
          setStatusItem(null)
          openImportWizard(item)
          return
        }
        if (item.status === "indexing_failed") {
          await retryIndexing.mutateAsync({ kbId, itemId: item.id })
          message.success("已重新排队索引")
          setStatusItem(null)
        }
      } catch (e) {
        message.error(e instanceof Error ? e.message : "重试失败")
      } finally {
        setRetryingItemId(null)
      }
    },
    [kbId, openImportWizard, retryExtraction, retryIndexing],
  )

  async function handlePickFile(file: File | null) {
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const imported = await importKbItem(kbId, file)
      setUploadOpen(false)
      navigate(`/kb/${kbId}/upload`, {
        state: {
          mode: "import",
          ingestItemId: imported.itemId,
          fileName: imported.fileName,
        },
      })
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "文件上传失败")
    } finally {
      setUploading(false)
    }
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault()
    if (!uploading) setDragOver(true)
  }

  const busy = setEnabled.isPending || deleteItem.isPending || !!retryingItemId

  const columns = useMemo<Array<DataTableColumn<KbItem>>>(
    () => [
      {
        key: "fileName",
        header: "文档名称",
        className: "w-[22%]",
        cellClassName: "max-w-[18rem] truncate",
        render: (item) => (
          <Button
            variant="ghost"
            className="h-auto max-w-full truncate px-0 font-normal text-foreground hover:bg-transparent hover:text-primary"
            onClick={() => navigate(`/kb/${kbId}/items/${item.id}`)}
            title={item.fileName}
          >
            {item.fileName}
          </Button>
        ),
      },
      {
        key: "status",
        header: "状态",
        className: "w-[12%]",
        render: (item) => {
          const label = STATUS_LABELS[item.status ?? ""] ?? item.status ?? "—"
          const interactive =
            item.status === "extraction_failed" ||
            item.status === "indexing_failed" ||
            item.status === "draft"
          if (!interactive) {
            return <span>{label}</span>
          }
          return (
            <Button
              variant="ghost"
              className={[
                "h-auto px-0 font-normal hover:bg-transparent",
                item.status?.endsWith("_failed")
                  ? "text-destructive hover:text-destructive"
                  : "text-foreground hover:text-foreground",
              ].join(" ")}
              onClick={() => setStatusItem(item)}
              title="查看状态详情"
            >
              {label}
            </Button>
          )
        },
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
            disabled={busy}
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
        cellClassName: "tabular-nums",
        render: (item) => new Date(item.createdAt).toLocaleString(),
      },
      {
        key: "updatedAt",
        header: "更新时间",
        className: "w-[15%]",
        cellClassName: "tabular-nums",
        render: (item) => new Date(item.updatedAt).toLocaleString(),
      },
      {
        key: "actions",
        header: "操作",
        className: "w-[12%] text-center",
        cellClassName: "text-center",
        render: (item) => {
          const canRetry =
            item.status === "extraction_failed" || item.status === "indexing_failed"
          return (
            <div className="inline-flex items-center justify-center gap-0.5 whitespace-nowrap">
              {canRetry ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-foreground/80 hover:bg-primary/10 hover:text-primary"
                  onClick={() => void onRetry(item)}
                  disabled={busy}
                  loading={retryingItemId === item.id}
                  title={item.status === "extraction_failed" ? "重试抽取" : "重试索引"}
                  aria-label={item.status === "extraction_failed" ? "重试抽取" : "重试索引"}
                >
                  <RotateCcw />
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-foreground/80 hover:bg-primary/10 hover:text-primary"
                onClick={() => void onEdit(item.id)}
                disabled={busy || editingItemId === item.id}
                loading={editingItemId === item.id}
                title="编辑"
                aria-label="编辑"
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-foreground/80 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleting(item)}
                disabled={busy}
                title="删除"
                aria-label="删除"
              >
                <Trash2 />
              </Button>
            </div>
          )
        },
      },
    ],
    [busy, editingItemId, kbId, navigate, onEdit, onRetry, onToggle, retryingItemId],
  )

  return {
    query,
    setQuery,
    items,
    list,
    total,
    page,
    setPage,
    pageSize: DEFAULT_PAGE_SIZE,
    countLabel,
    columns,
    uploadOpen,
    setUploadOpen,
    uploading,
    uploadError,
    dragOver,
    setDragOver,
    fileInputRef,
    statusItem,
    setStatusItem,
    deleting,
    setDeleting,
    deleteItem,
    confirmDelete,
    handlePickFile,
    handleDragOver,
    retrying: !!retryingItemId,
    onRetryStatusItem: () => {
      if (statusItem) void onRetry(statusItem)
    },
    onContinueDraft: () => {
      if (!statusItem) return
      const item = statusItem
      setStatusItem(null)
      openImportWizard(item)
    },
  }
}
