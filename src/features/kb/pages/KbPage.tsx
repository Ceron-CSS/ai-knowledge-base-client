import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { KbDeleteDialog } from "@/features/kb/components/KbDeleteDialog"
import { KbDisableDialog } from "@/features/kb/components/KbDisableDialog"
import { KbFormDialog } from "@/features/kb/components/KbFormDialog"
import { useKbPage } from "@/features/kb/hooks/useKbPage"

export function KbPage() {
  const kb = useKbPage()

  return (
    <div className="space-y-2">
      <div>
        <Breadcrumb items={[{ label: "知识库" }]} />
        <p className="mt-1 text-sm text-muted-foreground">
          创建、编辑、删除、启停知识库（停用后在所有配置中不可选）
        </p>
      </div>

      <KbFormDialog
        editing={kb.editing}
        name={kb.name}
        description={kb.description}
        isSaving={kb.isSaving}
        hasError={kb.createKb.isError || kb.updateKb.isError}
        submitLabel={kb.submitLabel}
        onNameChange={kb.setName}
        onDescriptionChange={kb.setDescription}
        onCancel={kb.cancelEdit}
        onSubmit={kb.submit}
      />

      <KbDeleteDialog
        kb={kb.deleting}
        linkedAssistants={kb.deletingLinked}
        confirming={kb.deleteKb.isPending}
        hasError={kb.deleteKb.isError}
        onCancel={kb.cancelDelete}
        onConfirm={kb.confirmDelete}
      />

      <KbDisableDialog
        kb={kb.disablingKb}
        linkedAssistants={kb.disablingLinked}
        confirming={kb.setEnabled.isPending}
        onCancel={kb.cancelDisable}
        onConfirm={kb.confirmDisable}
      />

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">{kb.countLabel}</div>
          {kb.linkedCheckError ? (
            <div className="text-sm text-destructive">{kb.linkedCheckError}</div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Input
            clearable
            value={kb.query}
            onChange={(e) => kb.setQuery(e.target.value)}
            placeholder="搜索知识库名称/描述"
          />
          <Button variant="primary" size="lg" onClick={kb.startCreate}>
            新建知识库
          </Button>
        </div>
      </div>

      <DataTable
        columns={kb.columns}
        data={kb.filteredList}
        getRowKey={(item) => item.id}
        loading={kb.kbList.isLoading}
        error={kb.kbList.isError}
        errorText="加载失败：请确认后端服务可用"
        pagination={{
          page: kb.page,
          pageSize: kb.pageSize,
          total: kb.total,
          onPageChange: kb.setPage,
        }}
      />
    </div>
  )
}
