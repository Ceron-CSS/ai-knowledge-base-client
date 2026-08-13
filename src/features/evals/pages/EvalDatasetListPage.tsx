import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { DataTable } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { Page, PageBody, PageHeader } from "@/components/ui/page-header"
import { EvalDatasetFormDialog } from "@/features/evals/components/EvalDatasetFormDialog"
import { useEvalDatasetListPage } from "@/features/evals/hooks/useEvalDatasetListPage"

export function EvalDatasetListPage() {
  const navigate = useNavigate()
  const page = useEvalDatasetListPage()

  return (
    <Page>
      <PageHeader
        items={[{ label: "评测与策略" }]}
        description="维护评测数据集与问题标签；策略发版请使用 Agent Policy"
      />

      <PageBody className="space-y-2">
        <EvalDatasetFormDialog
          editing={page.editing}
          name={page.name}
          description={page.description}
          isSaving={page.isSaving}
          hasError={page.hasFormError}
          onNameChange={page.setName}
          onDescriptionChange={page.setDescription}
          onCancel={page.cancelEdit}
          onSubmit={() => void page.submit()}
        />

        <ConfirmDeleteDialog
          open={!!page.deleting}
          description={
            page.deleting
              ? `将删除数据集「${page.deleting.name}」及其全部问题和运行记录，此操作不可恢复`
              : undefined
          }
          confirming={page.deletePending}
          errorText={page.deleteError ? "删除失败，请重试" : null}
          onCancel={() => page.setDeleting(null)}
          onConfirm={() => void page.confirmDelete()}
        />

        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">{page.countLabel}</div>
          <div className="flex items-center gap-2">
            <Input
              clearable
              value={page.query}
              onChange={(e) => page.setQuery(e.target.value)}
              placeholder="搜索数据集名称/说明"
            />
            <Button variant="outline" size="lg" onClick={() => navigate("/evals/policies")}>
              Agent Policy
            </Button>
            <Button variant="primary" size="lg" onClick={page.startCreate}>
              新建数据集
            </Button>
          </div>
        </div>

        <DataTable
          columns={page.columns}
          data={page.filtered}
          getRowKey={(item) => item.id}
          loading={page.datasets.isLoading}
          error={page.datasets.isError}
          errorText="加载失败：请确认后端服务可用"
          emptyText="暂无实验数据集，先创建一个开始标注问题"
        />
      </PageBody>
    </Page>
  )
}
