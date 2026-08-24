import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, Folder } from "lucide-react"
import type { FeishuSourceItem } from "@/api/feishu"
import { Button } from "@/components/ui/button"
import { LoadingText } from "@/components/ui/loading-text"
import type { FeishuDocPickerState } from "@/features/feishu/hooks/useFeishuDocPicker"

const TYPE_LABELS: Record<string, string> = {
  docx: "文档",
  folder: "文件夹",
  doc: "旧版文档",
  sheet: "表格",
  bitable: "多维表格",
  mindnote: "思维笔记",
  file: "文件",
  wiki: "知识空间",
  node: "节点",
}

function typeLabel(item: FeishuSourceItem) {
  return TYPE_LABELS[item.type] ?? item.type
}

type SourceRowProps = {
  item: FeishuSourceItem
  selected: boolean
  selectable: boolean
  onToggle: (item: FeishuSourceItem) => void
  onOpen: (item: FeishuSourceItem) => void
}

function SourceRow({
  item,
  selected,
  selectable,
  onToggle,
  onOpen,
}: SourceRowProps) {
  const isFolder = item.type === "folder"
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
      <input
        type="checkbox"
        checked={selected}
        disabled={!selectable}
        onChange={() => onToggle(item)}
        aria-label={`选择 ${item.name}`}
      />
      {isFolder ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-1 py-0 font-normal text-foreground hover:bg-transparent hover:text-primary"
          onClick={() => onOpen(item)}
          title="进入文件夹"
        >
          <Folder className="mr-1 h-4 w-4 text-muted-foreground" />
          <span className="truncate">{item.name}</span>
        </Button>
      ) : (
        <span className="truncate text-sm">{item.name}</span>
      )}
      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
        {typeLabel(item)}
      </span>
    </div>
  )
}

type FeishuDocPickerProps = {
  state: FeishuDocPickerState
}

export function FeishuDocPicker({ state }: FeishuDocPickerProps) {
  const {
    tab,
    setTab,
    currentDrive,
    driveLoading,
    driveError,
    openDrive,
    goBackDrive,
    spaces,
    activeSpace,
    wikiNodes,
    wikiLoading,
    loadSpaces,
    openSpace,
    goBackWiki,
    selection,
    isSelectable,
    toggleSelect,
    importing,
    results,
    runImport,
  } = state

  const selectedCount = selection.size
  const [linkInput, setLinkInput] = useState("")
  const autoLoadRef = useRef(false)

  useEffect(() => {
    // 连接成功后自动加载云空间根目录，避免用户看不到任何文档。
    if (autoLoadRef.current) return
    autoLoadRef.current = true
    if (!currentDrive && !driveLoading) {
      void openDrive(null, "我的空间")
    }
  }, [currentDrive, driveLoading, openDrive])

  const openDriveRoot = useCallback(() => {
    if (!currentDrive) void openDrive(null, "我的空间")
  }, [currentDrive, openDrive])

  const openWikiTab = useCallback(() => {
    setTab("wiki")
    void loadSpaces()
  }, [setTab, loadSpaces])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          type="button"
          className={[
            "flex-1 rounded-md px-3 py-1.5 text-sm transition",
            tab === "drive"
              ? "bg-background font-medium shadow-sm"
              : "text-muted-foreground",
          ].join(" ")}
          onClick={() => setTab("drive")}
        >
          云空间
        </button>
        <button
          type="button"
          className={[
            "flex-1 rounded-md px-3 py-1.5 text-sm transition",
            tab === "wiki"
              ? "bg-background font-medium shadow-sm"
              : "text-muted-foreground",
          ].join(" ")}
          onClick={openWikiTab}
        >
          知识库
        </button>
      </div>

      <div className="max-h-80 min-h-48 space-y-0.5 overflow-auto rounded-md border p-2">
        {tab === "drive" ? (
          <>
            <div className="mb-1 flex items-center gap-1 px-2 text-xs text-muted-foreground">
              {currentDrive ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-5 w-5"
                    onClick={goBackDrive}
                    aria-label="返回上级"
                  >
                    <ChevronLeft />
                  </Button>
                  <span className="truncate">{currentDrive.title}</span>
                </>
              ) : (
                <span>点击下方「我的空间」加载文件</span>
              )}
            </div>
            {driveLoading ? (
              <LoadingText className="py-8" />
            ) : driveError ? (
              <div className="px-2 py-4 text-sm text-destructive">
                {driveError}
              </div>
            ) : currentDrive ? (
              currentDrive.items.map((item) => (
                <SourceRow
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  selected={selection.has(item.id)}
                  selectable={isSelectable(item)}
                  onToggle={toggleSelect}
                  onOpen={(f) => void openDrive(f.id, f.name)}
                />
              ))
            ) : (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/50"
                onClick={openDriveRoot}
              >
                <Folder className="h-4 w-4 text-muted-foreground" />
                我的空间
              </button>
            )}
          </>
        ) : (
          <>
            {activeSpace ? (
              <>
                <div className="mb-1 flex items-center gap-1 px-2 text-xs text-muted-foreground">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-5 w-5"
                    onClick={goBackWiki}
                    aria-label="返回空间列表"
                  >
                    <ChevronLeft />
                  </Button>
                  <span className="truncate">{activeSpace.name}</span>
                </div>
                {wikiLoading ? (
                  <LoadingText className="py-8" />
                ) : (
                  wikiNodes.map((item) => (
                    <SourceRow
                      key={`${item.kind}-${item.id}`}
                      item={item}
                      selected={selection.has(item.id)}
                      selectable={isSelectable(item)}
                      onToggle={toggleSelect}
                      onOpen={() => undefined}
                    />
                  ))
                )}
              </>
            ) : (
              <div className="space-y-0.5">
                {wikiLoading ? (
                  <LoadingText className="py-8" />
                ) : (
                  spaces.map((space) => (
                    <button
                      key={space.id}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50"
                      onClick={() => void openSpace(space)}
                    >
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{space.name}</span>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        知识空间
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {results ? (
        <div className="space-y-1 rounded-md border p-2 text-sm">
          {results.map((result) => (
            <div key={result.docToken} className="flex items-center gap-2">
              <span className="truncate">{result.name}</span>
              <span
                className={[
                  "ml-auto shrink-0",
                  result.status === "importing"
                    ? "text-primary"
                    : result.status === "failed"
                      ? "text-destructive"
                      : "text-muted-foreground",
                ].join(" ")}
              >
                {result.status === "importing"
                  ? "已提交"
                  : result.status === "failed"
                    ? `失败${result.errorCode ? `（${result.errorCode}）` : ""}`
                    : "已存在"}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          已选择 {selectedCount} 篇
        </span>
        <Button
          variant="primary"
          size="lg"
          disabled={selectedCount === 0 || importing}
          loading={importing}
          onClick={() => void runImport()}
        >
          导入到知识库
        </Button>
      </div>

      <div className="rounded-md border p-2">
        <div className="mb-2 text-xs text-muted-foreground">
          或粘贴飞书文档 / 知识库链接直接导入（不在列表里的文档也能导入）
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="https://xxxx.feishu.cn/wiki/..."
            className="min-w-0 flex-1 rounded-md border px-2 py-1.5 text-sm"
          />
          <Button
            variant="primary"
            size="sm"
            disabled={importing || !linkInput.trim()}
            onClick={() => {
              void runImport(linkInput)
              setLinkInput("")
            }}
          >
            导入链接
          </Button>
        </div>
      </div>
    </div>
  )
}
