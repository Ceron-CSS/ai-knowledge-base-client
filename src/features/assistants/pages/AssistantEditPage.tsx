import { useParams, useNavigate } from "react-router-dom"
import type { Assistant } from "@/api/assistants"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingText } from "@/components/ui/loading-text"
import { MultiSelect } from "@/components/ui/multi-select"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAssistantEditForm } from "@/features/assistants/hooks/useAssistantEditForm"
import { useAssistant } from "@/features/assistants/hooks/queries"

export function AssistantEditPage() {
  const navigate = useNavigate()
  const params = useParams()
  const id = params.id

  const isNew = id === "new" || !id
  const existingQuery = useAssistant(id ?? "", !isNew && !!id)
  const existing = existingQuery.data as Assistant | undefined

  const {
    name,
    setName,
    description,
    setDescription,
    modelConfigId,
    setModelConfigId,
    baseModel,
    setBaseModel,
    systemPrompt,
    setSystemPrompt,
    kbIds,
    setKbIds,
    executionMode,
    setExecutionMode,
    agentSupported,
    agentDisabledReason,
    error,
    configOptions,
    baseModelOptions,
    kbPicker,
    modelConfigs,
    isPublished,
    submitting,
    savePending,
    unpublishPending,
    save,
    handlePublish,
    handleUnpublish,
  } = useAssistantEditForm({ existing })

  const title = isNew ? "创建问答助手" : "配置问答助手"

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumb
            items={[
              { label: "问答助手", href: "/assistants" },
              { label: title },
            ]}
          />
          <p className="mt-1 text-sm text-muted-foreground">填写配置后点击保存或发布（发布后可在对话页面使用）</p>
        </div>
      </div>

      <div className="rounded-lg border bg-background p-4">
        <div className="grid gap-6">
          {!isNew && existingQuery.isLoading ? (
            <LoadingText className="justify-start">加载中</LoadingText>
          ) : !isNew && existingQuery.isError ? (
            <div className="text-sm text-destructive">加载失败：请检查后端服务</div>
          ) : null}

          <div>
            <div className="mt-3 grid gap-4">
              <div>
                <label className="block text-sm font-medium">
                  助手名称 <span className="text-destructive">*</span>
                </label>
                <Input
                  className="mt-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：售后问答助手"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">描述</label>
                <Textarea
                  className="mt-2 min-h-24 resize-y"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="可选：简述该助手的用途与边界"
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium">知识库关联</div>
            <div className="mt-3">
              {kbPicker.isLoading ? (
                <LoadingText className="justify-start">加载知识库列表中</LoadingText>
              ) : kbPicker.isError ? (
                <div className="text-sm text-destructive">加载失败：请确认后端服务可用</div>
              ) : kbPicker.total > 0 || kbPicker.search.trim() || kbIds.length > 0 ? (
                <MultiSelect
                  value={kbIds}
                  onValueChange={setKbIds}
                  options={kbPicker.options}
                  placeholder="选择关联的知识库"
                  searchPlaceholder="搜索知识库..."
                  emptyText="无匹配的知识库"
                  searchValue={kbPicker.search}
                  onSearchChange={kbPicker.setSearch}
                  hasMore={kbPicker.hasMore}
                  onLoadMore={kbPicker.loadMore}
                  loadingMore={kbPicker.loadingMore}
                  searching={kbPicker.isFetching}
                />
              ) : (
                <div className="text-sm text-muted-foreground">暂无可关联的知识库，先去"知识库"创建</div>
              )}
            </div>
          </div>

          <div>
            <div className="mt-3 grid gap-4">
              <div>
                <label className="block text-sm font-medium">
                  模型配置 <span className="text-destructive">*</span>
                </label>
                <Select
                  className="mt-2"
                  value={modelConfigId}
                  onValueChange={setModelConfigId}
                  options={configOptions}
                  placeholder={modelConfigs.isLoading ? "加载模型配置中" : "请选择模型配置"}
                  disabled={!configOptions.length || modelConfigs.isLoading}
                />
                {!configOptions.length && !modelConfigs.isLoading ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    暂无可用模型配置，请先去“模型提供商”页面添加
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium">
                  基础模型 <span className="text-destructive">*</span>
                </label>
                <Select className="mt-2" value={baseModel} onValueChange={setBaseModel} options={baseModelOptions} />
              </div>

              <div>
                <label className="block text-sm font-medium">执行模式</label>
                <div className="mt-2 inline-flex rounded-md border p-1">
                  <button
                    type="button"
                    className={`rounded px-3 py-1.5 text-sm ${
                      executionMode === "workflow" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                    onClick={() => setExecutionMode("workflow")}
                  >
                    Workflow
                  </button>
                  <button
                    type="button"
                    className={`rounded px-3 py-1.5 text-sm ${
                      executionMode === "agent" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                    onClick={() => {
                      if (!agentSupported) return
                      setExecutionMode("agent")
                    }}
                    disabled={!agentSupported}
                    title={agentDisabledReason ?? undefined}
                  >
                    Agent
                  </button>
                </div>
                {!agentSupported ? (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {agentDisabledReason ?? "当前配置不支持 Agent 模式"}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Agent 模式会在受控边界内动态调用知识库工具；默认仍建议使用 Workflow。
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium">提示词（System Prompt）</label>
                <Textarea
                  className="mt-2 min-h-40 resize-y"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="例如：你是一个严格遵循公司知识库回答的助手..."
                  rows={8}
                />
              </div>
            </div>
          </div>

          {error ? <div className="text-sm text-destructive">{error}</div> : null}

          <div className="flex justify-end gap-3">
            <Button variant="dialog-cancel" size="lg" onClick={() => navigate("/assistants")} disabled={submitting}>
              取消
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={save}
              disabled={!name.trim() || !modelConfigId || !baseModel || submitting}
              loading={savePending}
            >
              保存
            </Button>
            {!isNew && isPublished ? (
              <Button
                variant="dialog-danger"
                size="lg"
                onClick={handleUnpublish}
                disabled={submitting}
                loading={unpublishPending}
              >
                取消发布
              </Button>
            ) : null}
            <Button
              variant="primary"
              size="lg"
              onClick={handlePublish}
              disabled={!name.trim() || !modelConfigId || !baseModel || submitting}
              loading={submitting && !unpublishPending}
            >
              {isPublished ? "重新发布" : "发布"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
