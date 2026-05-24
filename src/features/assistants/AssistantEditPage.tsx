import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { useKbList } from "@/features/kb/queries"
import type { Assistant } from "@/api/assistants"
import { useAssistant, useCreateAssistant, usePublishAssistant, useUpdateAssistant } from "@/features/assistants/queries"

function isProvider(value: string): value is "aliyun-bailian" {
  return value === "aliyun-bailian"
}

export function AssistantEditPage() {
  const navigate = useNavigate()
  const params = useParams()
  const id = params.id

  const isNew = id === "new" || !id
  const existingQuery = useAssistant(id ?? "", !isNew && !!id)
  const existing = existingQuery.data as Assistant | undefined

  const kbList = useKbList()
  const createAssistant = useCreateAssistant()
  const updateAssistant = useUpdateAssistant()
  const publishAssistant = usePublishAssistant()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [modelProvider, setModelProvider] = useState<"aliyun-bailian">("aliyun-bailian")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [kbIds, setKbIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!existing) return
    setName(existing.name)
    setDescription(existing.description ?? "")
    setModelProvider(isProvider(existing.modelProvider) ? existing.modelProvider : "aliyun-bailian")
    setSystemPrompt(existing.systemPrompt ?? "")
    setKbIds(existing.kbIds ?? [])
  }, [existing])

  const title = isNew ? "创建问答助手" : "配置问答助手"

  function toggleKb(kbId: string) {
    setKbIds((prev) => (prev.includes(kbId) ? prev.filter((id2) => id2 !== kbId) : [...prev, kbId]))
  }

  async function publish() {
    const trimmedName = name.trim()
    if (!trimmedName) return
    if (!isProvider(modelProvider)) return

    setError(null)
    try {
      if (isNew) {
        const created = await createAssistant.mutateAsync({
          name: trimmedName,
          description: description.trim() ? description.trim() : undefined,
          modelProvider,
          systemPrompt: systemPrompt.trim() ? systemPrompt.trim() : undefined,
          kbIds,
        })
        await publishAssistant.mutateAsync({ id: created.id })
        navigate("/assistants", { replace: true })
        return
      }

      if (!existing) {
        setError("未找到该助手，可能已被删除。")
        return
      }

      await updateAssistant.mutateAsync({
        id: existing.id,
        body: {
          name: trimmedName,
          description: description.trim() ? description.trim() : null,
          modelProvider,
          systemPrompt: systemPrompt.trim() ? systemPrompt.trim() : null,
          kbIds,
        },
      })
      await publishAssistant.mutateAsync({ id: existing.id })
      navigate("/assistants", { replace: true })
    } catch {
      setError("发布失败，请重试。")
    }
  }

  const submitting = createAssistant.isPending || updateAssistant.isPending || publishAssistant.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <button className="rounded-md border px-2 py-1.5 text-sm hover:bg-muted/60" onClick={() => navigate("/assistants")}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">填写配置后点击发布即可创建/更新问答助手。</p>
        </div>
      </div>

      <div className="rounded-lg border bg-background p-4">
        <div className="grid gap-6">
          {!isNew && existingQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">加载中...</div>
          ) : !isNew && existingQuery.isError ? (
            <div className="text-sm text-destructive">加载失败：请检查后端服务。</div>
          ) : null}

          <div>
            <div className="text-sm font-medium">基本信息</div>
            <div className="mt-3 grid gap-4">
              <div>
                <label className="block text-sm font-medium">
                  助手名称 <span className="text-destructive">*</span>
                </label>
                <input
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：售后问答助手"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">描述</label>
                <textarea
                  className="mt-2 min-h-24 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="可选：简述该助手的用途与边界"
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium">模型配置</div>
            <div className="mt-3 grid gap-4">
              <div>
                <label className="block text-sm font-medium">AI模型选择</label>
                <select
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
                  value={modelProvider}
                  onChange={(e) => {
                    const v = e.target.value
                    if (isProvider(v)) setModelProvider(v)
                  }}
                >
                  <option value="aliyun-bailian">阿里云百炼</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">提示词（System Prompt）</label>
                <textarea
                  className="mt-2 min-h-40 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="例如：你是一个严格遵循公司知识库回答的助手..."
                  rows={8}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium">知识库关联</div>
            <div className="mt-3">
              {kbList.isLoading ? (
                <div className="text-sm text-muted-foreground">加载知识库列表中...</div>
              ) : kbList.isError ? (
                <div className="text-sm text-destructive">加载失败：请确认后端服务可用。</div>
              ) : kbList.data?.length ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {kbList.data.map((kb) => (
                    <label key={kb.id} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/30">
                      <input type="checkbox" checked={kbIds.includes(kb.id)} onChange={() => toggleKb(kb.id)} />
                      <span className="min-w-0 truncate" title={kb.name}>
                        {kb.name}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">暂无知识库可关联，先去“知识库”创建。</div>
              )}
            </div>
          </div>

          {error ? <div className="text-sm text-destructive">{error}</div> : null}

          <div className="flex justify-end gap-2">
            <button className="rounded-md border px-3 py-2 text-sm hover:bg-muted/60" onClick={() => navigate("/assistants")} disabled={submitting}>
              取消
            </button>
            <button
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              onClick={publish}
              disabled={!name.trim() || submitting}
            >
              {submitting ? "发布中..." : "发布"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
