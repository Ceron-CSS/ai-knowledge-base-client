import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { MessageSquare, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { Page, PageBody, PageHeader } from "@/components/ui/page-header"
import { Switch } from "@/components/ui/switch"
import type { Assistant } from "@/api/assistants"
import {
  useAssistantList,
  useDeleteAssistant,
  usePublishAssistant,
  useUnpublishAssistant,
} from "@/features/assistants/hooks/queries"
import { MODEL_PROVIDERS } from "@/features/modelProviders/constants/providers"
import { message } from "@/components/ui/message"
import { formatShanghaiDateTime } from "@/lib/dateTime"

function modelProviderLabel(provider: string) {
  return MODEL_PROVIDERS.find((item) => item.value === provider)?.label ?? provider
}

export function AssistantListPage() {
  const navigate = useNavigate()
  const assistants = useAssistantList()
  const deleteAssistant = useDeleteAssistant()
  const publishAssistant = usePublishAssistant()
  const unpublishAssistant = useUnpublishAssistant()

  const [deleting, setDeleting] = useState<Assistant | null>(null)
  const [query, setQuery] = useState("")

  const items = useMemo(() => assistants.data ?? [], [assistants.data])
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((a) =>
      [a.name, a.description, a.modelProvider, a.baseModel].some((value) => value?.toLowerCase().includes(q)),
    )
  }, [items, query])
  const countLabel = useMemo(() => {
    if (query.trim()) return `${filteredItems.length}/${items.length} 个助手`
    return `${items.length} 个助手`
  }, [filteredItems.length, items.length, query])

  function startDelete(a: Assistant) {
    setDeleting(a)
  }

  function cancelDelete() {
    setDeleting(null)
  }

  async function confirmDelete() {
    if (!deleting) return
    await deleteAssistant.mutateAsync({ id: deleting.id })
    cancelDelete()
  }

  function handlePublish(a: Assistant) {
    publishAssistant.mutate({ id: a.id })
  }

  function handleUnpublish(a: Assistant) {
    unpublishAssistant.mutate({ id: a.id })
  }

  function handlePublishedChange(a: Assistant) {
    if (a.publishedAt) {
      handleUnpublish(a)
      return
    }
    handlePublish(a)
  }

  function goChat(a: Assistant) {
    if (!a.publishedAt) {
      message.error("该问答助手尚未发布，发布后才能进入对话", 3000)
      return
    }
    navigate(`/assistants/${a.id}/chat`)
  }

  const columns: Array<DataTableColumn<Assistant>> = [
    {
      key: "assistant",
      header: "助手名称",
      className: "w-[12%]",
      render: (a) => (
        <button
          type="button"
          className="block max-w-full truncate text-left text-sm text-foreground hover:text-primary"
          onClick={() => navigate(`/assistants/${encodeURIComponent(a.id)}`)}
          title={a.name}
        >
          {a.name}
        </button>
      ),
    },
    {
      key: "description",
      header: "描述",
      className: "w-[18%]",
      cellClassName: "text-xs text-muted-foreground",
      render: (a) => (
        <div className="line-clamp-2 leading-5" title={a.description ?? undefined}>
          {a.description?.trim() || "暂无描述"}
        </div>
      ),
    },
    {
      key: "model",
      header: "模型",
      className: "w-[15%]",
      cellClassName: "text-xs",
      render: (a) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground" title={modelProviderLabel(a.modelProvider)}>
            {modelProviderLabel(a.modelProvider)}
          </div>
          <div className="mt-1 truncate text-muted-foreground" title={a.baseModel ?? undefined}>
            {a.baseModel || "未配置基础模型"}
          </div>
        </div>
      ),
    },
    {
      key: "kb",
      header: "关联知识库",
      className: "w-[10%]",
      render: (a) => {
        const count = a.kbIds.length
        return (
          <span className={count ? "tabular-nums" : "text-muted-foreground"}>
            {count ? `${count} 个` : "未关联"}
          </span>
        )
      },
    },
    {
      key: "createdAt",
      header: "创建时间",
      className: "w-[12%]",
      cellClassName: "text-xs text-muted-foreground",
      render: (a) => (
        <span className="whitespace-nowrap">
          {formatShanghaiDateTime(a.createdAt, { includeSeconds: true })}
        </span>
      ),
    },
    {
      key: "updatedAt",
      header: "修改时间",
      className: "w-[12%]",
      cellClassName: "text-xs text-muted-foreground",
      render: (a) => (
        <span className="whitespace-nowrap">
          {formatShanghaiDateTime(a.updatedAt, { includeSeconds: true })}
        </span>
      ),
    },
    {
      key: "status",
      header: "发布状态",
      className: "w-[10%] text-center",
      cellClassName: "text-center",
      render: (a) => (
        <div className="inline-flex items-center justify-center">
          <Switch
            size="sm"
            checked={!!a.publishedAt}
            onCheckedChange={() => handlePublishedChange(a)}
            disabled={publishAssistant.isPending || unpublishAssistant.isPending}
            aria-label={a.publishedAt ? "取消发布" : "发布"}
          />
        </div>
      ),
    },
    {
      key: "actions",
      header: "操作",
      className: "w-[10%] text-center",
      cellClassName: "text-center",
      render: (a) => (
        <div className="inline-flex items-center justify-center gap-1 whitespace-nowrap">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-foreground/80 hover:bg-primary/10 hover:text-primary"
            onClick={() => goChat(a)}
            disabled={!a.publishedAt}
            title="对话"
            aria-label="对话"
          >
            <MessageSquare />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-foreground/80 hover:bg-primary/10 hover:text-primary"
            onClick={() => navigate(`/assistants/${encodeURIComponent(a.id)}`)}
            title="配置"
            aria-label="配置"
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-foreground/80 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => startDelete(a)}
            disabled={deleteAssistant.isPending}
            title="删除"
            aria-label="删除"
          >
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <Page>
      <PageHeader items={[{ label: "问答助手" }]} description="管理问答助手的配置与发布状态" />

      <PageBody className="space-y-2">
        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>{countLabel}</div>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
            <Input
              clearable
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索助手、描述或模型"
            />
            <Button variant="primary" size="lg" onClick={() => navigate("/assistants/new")}>
              新建问答助手
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredItems}
          getRowKey={(a) => a.id}
          loading={assistants.isLoading}
          error={assistants.isError}
          errorText="加载失败，请检查后端服务"
          emptyText={items.length ? "没有匹配的问答助手" : "暂无数据"}
          tableClassName="min-w-[1120px]"
        />

        <ConfirmDeleteDialog
          open={!!deleting}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
          description={deleting ? `将删除问答助手「${deleting.name}」，此操作不可恢复` : undefined}
          errorText={deleteAssistant.isError ? "删除失败，请重试" : null}
          confirming={deleteAssistant.isPending}
        />
      </PageBody>
    </Page>
  )
}
