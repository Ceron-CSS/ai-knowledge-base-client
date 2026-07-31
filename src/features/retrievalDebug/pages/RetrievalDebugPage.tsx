import { ExternalLink, Search } from "lucide-react"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingText } from "@/components/ui/loading-text"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useRetrievalDebugPage } from "@/features/retrievalDebug/hooks/useRetrievalDebugPage"

function sourceLabel(source: string) {
  if (source === "vector") return "向量"
  if (source === "keyword") return "关键词"
  if (source === "vector+keyword" || source === "keyword+vector") return "混合"
  return source
}

export function RetrievalDebugPage() {
  const page = useRetrievalDebugPage()

  return (
    <div className="space-y-4">
      <div>
        <Breadcrumb items={[{ label: "召回调试台" }]} />
        <p className="mt-1 text-sm text-muted-foreground">
          选择知识库并输入查询，查看混合召回片段、相关度分数与来源文档
        </p>
      </div>

      <section className="rounded-lg border bg-background p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_120px_auto]">
          <div>
            <label className="mb-1.5 block text-sm font-medium">知识库</label>
            <Select
              value={page.kbId}
              onValueChange={page.setKbId}
              options={page.kbOptions}
              placeholder={page.kbList.isLoading ? "加载中…" : "选择知识库"}
              disabled={page.kbList.isLoading || page.searching}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Top K</label>
            <Input
              type="number"
              min={1}
              max={20}
              value={page.topK}
              onChange={(e) => page.setTopK(e.target.value)}
              disabled={page.searching}
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => void page.onSearch()}
              disabled={!page.canSearch}
              loading={page.searching}
            >
              <Search className="h-4 w-4" />
              召回
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1.5 block text-sm font-medium">查询</label>
          <Textarea
            rows={3}
            value={page.query}
            onChange={(e) => page.setQuery(e.target.value)}
            placeholder="输入要测试的查询语句…"
            disabled={page.searching}
          />
        </div>

        {page.kbList.isError ? (
          <div className="mt-3 text-sm text-destructive">知识库列表加载失败，请确认后端服务可用</div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="text-sm text-muted-foreground">
          {page.searching ? <LoadingText className="justify-start">正在召回</LoadingText> : page.resultLabel}
        </div>
        {page.error ? <div className="text-sm text-destructive">{page.error}</div> : null}

        {!page.searching && page.searched && !page.error && page.hits.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            未召回到相关片段，可尝试换个查询或检查知识库是否已完成索引
          </div>
        ) : null}

        <div className="space-y-3">
          {page.hits.map((hit, index) => {
            const openKey = `${hit.itemId}:${hit.chunkIndex}`
            const opening = page.openingKey === openKey
            return (
              <article key={`${hit.chunkId}-${index}`} className="rounded-lg border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">
                        #{index + 1}
                      </span>
                      <span className="tabular-nums">score {hit.score.toFixed(4)}</span>
                      <span>{sourceLabel(hit.retrievalSource)}</span>
                      <span>分片 #{hit.chunkIndex + 1}</span>
                    </div>
                    <div className="truncate text-sm font-medium" title={hit.fileName}>
                      {hit.fileName}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void page.openHit(hit)}
                    disabled={opening || page.openingKey !== null}
                    loading={opening}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    打开文档分片
                  </Button>
                </div>
                <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 text-sm">
                  {hit.snippet}
                </pre>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
