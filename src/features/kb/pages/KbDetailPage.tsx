import { useParams } from "react-router-dom"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { Page, PageBody, PageHeader } from "@/components/ui/page-header"
import { FeishuImportDialog } from "@/features/feishu"
import { KbFileUploadDialog } from "@/features/kb/components/KbFileUploadDialog"
import { KbItemStatusDialog } from "@/features/kb/components/KbItemStatusDialog"
import { useKbDetailPage } from "@/features/kb/hooks/useKbDetailPage"

export function KbDetailPage() {
  const { id = "" } = useParams()
  const kb = useKbDetailPage({ kbId: id })

  return (
    <Page>
      <PageHeader
        items={[{ label: "知识库", href: "/kb" }, { label: "文档列表" }]}
        description="查看文档列表，支持删除与启用/禁用"
      />

      <PageBody className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">{kb.countLabel}</div>
          <div className="flex items-center gap-2">
            <Input
              clearable
              value={kb.query}
              onChange={(e) => kb.setQuery(e.target.value)}
              placeholder="搜索文件名称"
            />
            <Button
              variant="primary"
              size="lg"
              onClick={() => kb.setUploadOpen(true)}
            >
              上传文件
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={() => kb.setFeishuOpen(true)}
            >
              从飞书导入
            </Button>
          </div>
        </div>

        <DataTable
          columns={kb.columns}
          data={kb.list}
          getRowKey={(item) => item.id}
          loading={kb.items.isLoading}
          error={kb.items.isError}
          pagination={{
            page: kb.page,
            pageSize: kb.pageSize,
            total: kb.total,
            onPageChange: kb.setPage,
          }}
        />

        <KbFileUploadDialog
          open={kb.uploadOpen}
          uploading={kb.uploading}
          uploadError={kb.uploadError}
          dragOver={kb.dragOver}
          fileInputRef={kb.fileInputRef}
          onOpenChange={kb.setUploadOpen}
          onPickFile={(file) => void kb.handlePickFile(file)}
          onDragOver={kb.handleDragOver}
          onDragLeave={() => kb.setDragOver(false)}
        />

        <FeishuImportDialog
          kbId={id}
          open={kb.feishuOpen}
          onOpenChange={kb.setFeishuOpen}
        />

        <KbItemStatusDialog
          open={!!kb.statusItem}
          kbId={id}
          item={kb.statusItem}
          onOpenChange={(open) => {
            if (!open) kb.setStatusItem(null)
          }}
          onRetryExtraction={
            kb.statusItem?.status === "extraction_failed"
              ? kb.onRetryStatusItem
              : undefined
          }
          onRetryIndexing={
            kb.statusItem?.status === "indexing_failed"
              ? kb.onRetryStatusItem
              : undefined
          }
          onContinueDraft={
            kb.statusItem?.status === "draft" ? kb.onContinueDraft : undefined
          }
          retrying={kb.retrying}
        />

        <ConfirmDeleteDialog
          open={!!kb.deleting}
          onCancel={() => kb.setDeleting(null)}
          onConfirm={kb.confirmDelete}
          description={
            kb.deleting
              ? `将删除文档「${kb.deleting.fileName}」，该操作不可恢复`
              : undefined
          }
          errorText={kb.deleteItem.isError ? "删除失败，请重试" : null}
          confirming={kb.deleteItem.isPending}
        />
      </PageBody>
    </Page>
  )
}
