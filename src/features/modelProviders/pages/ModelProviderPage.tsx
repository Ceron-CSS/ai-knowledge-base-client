import { Page, PageBody, PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { ModelProviderDeleteDialog } from "@/features/modelProviders/components/ModelProviderDeleteDialog"
import { ModelProviderFormDialog } from "@/features/modelProviders/components/ModelProviderFormDialog"
import { useModelProviderPage } from "@/features/modelProviders/hooks/useModelProviderPage"

export function ModelProviderPage() {
  const providers = useModelProviderPage()

  return (
    <Page>
      <PageHeader
        items={[{ label: "模型提供商" }]}
        description="管理模型提供商（每种仅允许配置一个）"
      />

      <PageBody className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">{providers.countLabel}</div>
            {providers.linkedCheckError ? (
              <div className="text-sm text-destructive">{providers.linkedCheckError}</div>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              clearable
              value={providers.query}
              onChange={(e) => providers.setQuery(e.target.value)}
              placeholder="搜索模型提供商"
            />
            <span className="group relative inline-flex">
              <Button
                variant="primary"
                size="lg"
                onClick={providers.openCreate}
                disabled={!providers.canCreate}
              >
                新建模型提供商
              </Button>
              {!providers.canCreate ? (
                <span className="pointer-events-none absolute top-full left-1/2 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100">
                  所有模型提供商都已配置
                </span>
              ) : null}
            </span>
          </div>
        </div>

        <DataTable
          columns={providers.columns}
          data={providers.filteredList}
          getRowKey={(item) => item.id}
          loading={providers.modelConfigs.isLoading}
          error={providers.modelConfigs.isError}
          errorText={
            <>
              加载失败，请检查后端服务
              {providers.loadErrorText ? (
                <div className="mt-2 text-xs text-muted-foreground">{providers.loadErrorText}</div>
              ) : null}
            </>
          }
        />

        <ModelProviderFormDialog
          open={providers.open}
          editing={providers.editing}
          form={providers.form}
          usedProviders={providers.usedProviders}
          error={providers.error}
          submitting={providers.submitting}
          onClose={providers.closeDialog}
          onSubmit={providers.submit}
          onFormChange={providers.setForm}
        />

        <ModelProviderDeleteDialog
          config={providers.deleting}
          linkedAssistants={providers.deletingLinked}
          confirming={providers.deleteModel.isPending}
          onCancel={providers.cancelDelete}
          onConfirm={providers.confirmDelete}
        />
      </PageBody>
    </Page>
  )
}
