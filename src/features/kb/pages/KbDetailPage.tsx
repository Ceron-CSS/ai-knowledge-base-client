import { useParams } from "react-router-dom"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { KbFileUploadDialog } from "@/features/kb/components/KbFileUploadDialog"
import { useKbDetailPage } from "@/features/kb/hooks/useKbDetailPage"

export function KbDetailPage() {
  const { id = "" } = useParams()
  const kb = useKbDetailPage({ kbId: id })

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
        <div className="text-sm text-muted-foreground">{kb.countLabel}</div>
        <Button variant="primary" size="lg" onClick={() => kb.setUploadOpen(true)}>
          上传文件
        </Button>
      </div>

      <DataTable
        columns={kb.columns}
        data={kb.list}
        getRowKey={(item) => item.id}
        loading={kb.items.isLoading}
        error={kb.items.isError}
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

      <ConfirmDeleteDialog
        open={!!kb.deleting}
        onCancel={() => kb.setDeleting(null)}
        onConfirm={kb.confirmDelete}
        description={kb.deleting ? `将删除文档「${kb.deleting.fileName}」，该操作不可恢复` : undefined}
        errorText={kb.deleteItem.isError ? "删除失败，请重试" : null}
        confirming={kb.deleteItem.isPending}
      />
    </div>
  )
}
