import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { FolderOpen, Pencil, Trash2 } from "lucide-react"
import type { Kb } from "@/api/kb"
import { Button } from "@/components/ui/button"
import type { DataTableColumn } from "@/components/ui/data-table"
import { Switch } from "@/components/ui/switch"
import { formatCharCountK } from "@/features/kb/lib/formatCharCountK"

type UseKbTableColumnsOptions = {
  onEdit: (kb: Kb) => void
  onDelete: (kb: Kb) => void | Promise<void>
  onToggleEnabled: (kb: Kb) => void | Promise<void>
  setEnabledPending: boolean
  setEnabledError: boolean
  deletePending: boolean
  checkingLinked: boolean
}

export function useKbTableColumns({
  onEdit,
  onDelete,
  onToggleEnabled,
  setEnabledPending,
  setEnabledError,
  deletePending,
  checkingLinked,
}: UseKbTableColumnsOptions) {
  const navigate = useNavigate()

  return useMemo<Array<DataTableColumn<Kb>>>(
    () => [
      {
        key: "name",
        header: "名称",
        className: "w-[10%]",
        render: (kb) => (
          <Button
            variant="link"
            className="h-auto max-w-[18rem] truncate px-0 font-normal hover:no-underline"
            onClick={() => navigate(`/kb/${kb.id}`)}
            title={kb.name}
          >
            {kb.name}
          </Button>
        ),
      },
      {
        key: "description",
        header: "描述",
        className: "w-[18%]",
        cellClassName: "text-muted-foreground",
        render: (kb) => (
          <div className="max-w-[28rem] truncate" title={kb.description || ""}>
            {kb.description || "-"}
          </div>
        ),
      },
      {
        key: "docCount",
        header: "文档数",
        className: "w-[6%]",
        cellClassName: "tabular-nums",
        render: (kb) => kb.docCount,
      },
      {
        key: "charCount",
        header: "字符",
        className: "w-[7%]",
        cellClassName: "tabular-nums",
        render: (kb) => formatCharCountK(kb.charCount),
      },
      {
        key: "createdAt",
        header: "创建时间",
        className: "w-[14%]",
        cellClassName: "tabular-nums text-muted-foreground",
        render: (kb) => new Date(kb.createdAt).toLocaleString(),
      },
      {
        key: "updatedAt",
        header: "修改时间",
        className: "w-[14%]",
        cellClassName: "tabular-nums text-muted-foreground",
        render: (kb) => new Date(kb.updatedAt).toLocaleString(),
      },
      {
        key: "enabled",
        header: "状态",
        className: "w-[8%]",
        render: (kb) => (
          <Switch
            checked={kb.enabled}
            size="sm"
            disabled={setEnabledPending || checkingLinked}
            aria-label={kb.enabled ? "停用知识库" : "启用知识库"}
            title={kb.enabled ? "停用" : "启用"}
            onCheckedChange={() => void onToggleEnabled(kb)}
          />
        ),
      },
      {
        key: "actions",
        header: "操作",
        className: "w-[12%] text-center",
        cellClassName: "text-center",
        render: (kb) => (
          <>
            <div className="inline-flex items-center justify-center gap-0.5 whitespace-nowrap">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => navigate(`/kb/${kb.id}`)}
                disabled={deletePending}
                title="管理"
                aria-label="管理"
              >
                <FolderOpen />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onEdit(kb)}
                disabled={setEnabledPending}
                title="设置"
                aria-label="设置"
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void onDelete(kb)}
                disabled={setEnabledPending || deletePending || checkingLinked}
                title="删除"
                aria-label="删除"
              >
                <Trash2 />
              </Button>
            </div>
            {setEnabledError ? <div className="mt-2 text-xs text-destructive">启停失败，请重试</div> : null}
          </>
        ),
      },
    ],
    [
      checkingLinked,
      deletePending,
      navigate,
      onDelete,
      onEdit,
      onToggleEnabled,
      setEnabledError,
      setEnabledPending,
    ],
  )
}
