import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { DataTable } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { Page, PageBody, PageHeader } from "@/components/ui/page-header"
import { KbItemStatusDialog } from "@/features/kb/components/KbItemStatusDialog"
import { useKbItemsPage } from "@/features/kb/hooks/useKbItemsPage"

export function KbItemsPage() {
  const page = useKbItemsPage()

  return (
    <Page>
      <PageHeader
        items={[{ label: "文档条目" }]}
        description="查看所有知识库下的文档，并按所属知识库区分"
      />

      <PageBody className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">{page.countLabel}</div>
          <Input
            clearable
            value={page.query}
            onChange={(e) => page.setQuery(e.target.value)}
            placeholder="搜索文件名称/知识库"
          />
        </div>

        <DataTable
          columns={page.columns}
          data={page.list}
          getRowKey={(item) => item.id}
          loading={page.items.isLoading}
          error={page.items.isError}
          pagination={{
            page: page.page,
            pageSize: page.pageSize,
            total: page.total,
            onPageChange: page.setPage,
          }}
        />

        <KbItemStatusDialog
          open={!!page.statusItem}
          kbId={page.statusItem?.kbId ?? ""}
          item={page.statusItem}
          onOpenChange={(open) => {
            if (!open) page.setStatusItem(null)
          }}
          onRetryExtraction={
            page.statusItem?.status === "extraction_failed"
              ? page.onRetryStatusItem
              : undefined
          }
          onRetryIndexing={
            page.statusItem?.status === "indexing_failed"
              ? page.onRetryStatusItem
              : undefined
          }
          onContinueDraft={
            page.statusItem?.status === "draft" ? page.onContinueDraft : undefined
          }
          retrying={page.retrying}
        />

        <ConfirmDeleteDialog
          open={!!page.deleting}
          onCancel={() => page.setDeleting(null)}
          onConfirm={page.confirmDelete}
          description={
            page.deleting
              ? `将删除文档「${page.deleting.fileName}」，该操作不可恢复`
              : undefined
          }
          errorText={page.deleteItem.isError ? "删除失败，请重试" : null}
          confirming={page.deleteItem.isPending}
        />
      </PageBody>
    </Page>
  )
}
