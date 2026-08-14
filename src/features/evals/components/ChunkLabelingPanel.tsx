import { ExternalLink, Search, X } from "lucide-react"
import type { SearchHit } from "@/api/search"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingText } from "@/components/ui/loading-text"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import type { useChunkLabeling } from "@/features/evals/hooks/useChunkLabeling"

function sourceLabel(source: string) {
  if (source === "vector") return "向量"
  if (source === "keyword") return "关键词"
  if (source === "vector+keyword" || source === "keyword+vector") return "混合"
  return source
}

type ChunkLabelingPanelProps = {
  labeling: ReturnType<typeof useChunkLabeling>
  /** 用当前问题作为召回查询的快捷填充 */
  onUseQuestionAsQuery?: () => void
}

export function ChunkLabelingPanel({ labeling, onUseQuestionAsQuery }: ChunkLabelingPanelProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
        自动召回只提供候选，请人工勾选相关 Chunk 作为实验标签，不要把模型召回结果直接当作真值。
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_100px_auto]">
        <div>
          <label className="mb-1.5 block text-sm font-medium">知识库</label>
          <SearchableSelect
            value={labeling.kbId}
            onValueChange={labeling.setKbId}
            options={labeling.kbOptions}
            placeholder={labeling.kbPicker.isLoading ? "加载中…" : "选择知识库"}
            searchPlaceholder="搜索知识库..."
            emptyText="无匹配的知识库"
            disabled={labeling.kbPicker.isLoading || labeling.searching}
            searchValue={labeling.kbPicker.search}
            onSearchChange={labeling.kbPicker.setSearch}
            hasMore={labeling.kbPicker.hasMore}
            onLoadMore={labeling.kbPicker.loadMore}
            loadingMore={labeling.kbPicker.loadingMore}
            searching={labeling.kbPicker.isFetching}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Top K</label>
          <Input
            type="number"
            min={1}
            max={20}
            value={labeling.topK}
            onChange={(e) => labeling.setTopK(e.target.value)}
            disabled={labeling.searching}
          />
        </div>
        <div className="flex items-end gap-2">
          {onUseQuestionAsQuery ? (
            <Button
              variant="outline"
              size="lg"
              onClick={onUseQuestionAsQuery}
              disabled={labeling.searching}
            >
              填入问题
            </Button>
          ) : null}
          <Button
            variant="primary"
            size="lg"
            onClick={() => void labeling.onSearch()}
            disabled={!labeling.canSearch}
            loading={labeling.searching}
          >
            <Search className="h-4 w-4" />
            召回候选
          </Button>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">召回查询</label>
        <Textarea
          rows={2}
          value={labeling.query}
          onChange={(e) => labeling.setQuery(e.target.value)}
          placeholder="可用问题原文，也可改成更利于召回的检索词"
          disabled={labeling.searching}
        />
      </div>

      {labeling.selectedIds.length > 0 ? (
        <div className="space-y-2">
          <div className="text-sm font-medium">已选相关 Chunk（{labeling.selectedIds.length}）</div>
          {labeling.loadingSelected ? (
            <LoadingText className="justify-start text-xs">正在加载已选 Chunk</LoadingText>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {labeling.selectedIds.map((id, index) => {
              const hit = labeling.hitByChunkId[id]
              const label = hit ? `${hit.fileName} #${hit.chunkIndex + 1}` : `已选 Chunk ${index + 1}`
              return (
                <span
                  key={id}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs"
                >
                  <span className="truncate" title={hit ? label : id}>
                    {label}
                  </span>
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => labeling.removeChunk(id)}
                    aria-label="移除"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">尚未选择相关 Chunk（评测运行至少需要一个标签）</div>
      )}

      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">
          {labeling.searching ? (
            <LoadingText className="justify-start">正在召回候选</LoadingText>
          ) : labeling.searched ? (
            `候选 ${labeling.hits.length} 条`
          ) : (
            "召回后勾选相关片段"
          )}
        </div>
        {labeling.error ? <div className="text-sm text-destructive">{labeling.error}</div> : null}
        {labeling.kbPicker.isError ? (
          <div className="text-sm text-destructive">知识库列表加载失败</div>
        ) : null}

        {labeling.hits.map((hit, index) => (
          <CandidateHit
            key={`${hit.chunkId}-${index}`}
            hit={hit}
            index={index}
            selected={labeling.selectedIds.includes(hit.chunkId)}
            onToggle={() => labeling.toggleChunk(hit.chunkId)}
            onOpen={() => labeling.openHit(hit)}
          />
        ))}
      </div>
    </div>
  )
}

function CandidateHit({
  hit,
  index,
  selected,
  onToggle,
  onOpen,
}: {
  hit: SearchHit
  index: number
  selected: boolean
  onToggle: () => void
  onOpen: () => void
}) {
  return (
    <article
      className={`rounded-lg border p-3 ${selected ? "border-primary/50 bg-primary/5" : "border-border bg-card"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <label className="flex min-w-0 cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-primary"
            checked={selected}
            onChange={onToggle}
          />
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
        </label>
        <Button variant="outline" size="sm" onClick={onOpen}>
          <ExternalLink className="h-3.5 w-3.5" />
          打开原文
        </Button>
      </div>
      <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 text-sm">
        {hit.snippet}
      </pre>
    </article>
  )
}
