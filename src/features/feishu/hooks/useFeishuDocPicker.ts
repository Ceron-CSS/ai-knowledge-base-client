import { useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  importFeishuDocs,
  listFeishuSources,
  type FeishuImportDoc,
  type FeishuImportResult,
  type FeishuSourceItem,
} from "@/api/feishu"
import { message } from "@/components/ui/message"
import { queryKeys } from "@/app/queryKeys"

const SELECTABLE_TYPES = new Set(["docx", "doc", "sheet", "file"])

type DriveLevel = {
  title: string
  token: string | null
  items: FeishuSourceItem[]
}

export function useFeishuDocPicker(kbId: string) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<"drive" | "wiki">("drive")

  const [driveStack, setDriveStack] = useState<DriveLevel[]>([])
  const [driveLoading, setDriveLoading] = useState(false)
  const [driveError, setDriveError] = useState<string | null>(null)

  const [spaces, setSpaces] = useState<FeishuSourceItem[]>([])
  const [spacesLoaded, setSpacesLoaded] = useState(false)
  const [activeSpace, setActiveSpace] = useState<FeishuSourceItem | null>(null)
  const [wikiNodes, setWikiNodes] = useState<FeishuSourceItem[]>([])
  const [wikiLoading, setWikiLoading] = useState(false)

  const [selection, setSelection] = useState<Map<string, FeishuImportDoc>>(
    new Map()
  )
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<FeishuImportResult[] | null>(null)

  const currentDrive =
    driveStack.length > 0 ? driveStack[driveStack.length - 1] : null

  const openDrive = useCallback(
    async (folderToken: string | null, title: string) => {
      setDriveLoading(true)
      setDriveError(null)
      try {
        const { items } = await listFeishuSources({
          kind: "drive",
          folderToken: folderToken ?? undefined,
        })
        setDriveStack((prev) => [...prev, { title, token: folderToken, items }])
      } catch (error) {
        setDriveError(
          error instanceof Error ? error.message : "加载云空间文件失败"
        )
      } finally {
        setDriveLoading(false)
      }
    },
    []
  )

  const goBackDrive = useCallback(() => {
    setDriveStack((prev) => prev.slice(0, -1))
  }, [])

  const loadSpaces = useCallback(async () => {
    if (spacesLoaded) return
    setWikiLoading(true)
    try {
      const { items } = await listFeishuSources({ kind: "wiki" })
      setSpaces(items)
      setSpacesLoaded(true)
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载知识库失败")
    } finally {
      setWikiLoading(false)
    }
  }, [spacesLoaded])

  const openSpace = useCallback(async (space: FeishuSourceItem) => {
    setActiveSpace(space)
    setWikiNodes([])
    setWikiLoading(true)
    try {
      const { items } = await listFeishuSources({
        kind: "wiki",
        spaceId: space.id,
      })
      setWikiNodes(items)
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "加载知识库节点失败"
      )
    } finally {
      setWikiLoading(false)
    }
  }, [])

  const goBackWiki = useCallback(() => {
    setActiveSpace(null)
    setWikiNodes([])
  }, [])

  const isSelectable = useCallback(
    (item: FeishuSourceItem) => SELECTABLE_TYPES.has(item.type),
    []
  )

  const toggleSelect = useCallback((item: FeishuSourceItem) => {
    setSelection((prev) => {
      const next = new Map(prev)
      if (next.has(item.id)) {
        next.delete(item.id)
      } else {
        next.set(item.id, {
          id: item.id,
          name: item.name,
          kind: item.kind,
          type: item.type,
        })
      }
      return next
    })
  }, [])

  const runImport = useCallback(
    async (link?: string) => {
      const links = link?.trim() ? [link.trim()] : []
      if (importing || (selection.size === 0 && links.length === 0)) return
      setImporting(true)
      setResults(null)
      try {
        const { results: importResults } = await importFeishuDocs(
          kbId,
          [...selection.values()],
          links
        )
        setResults(importResults)
        // 刷新 KB 文档列表，让新导入的条目立即显示。
        await queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeBases.items(kbId) })
        const imported = importResults.filter(
          (r) => r.status === "importing"
        ).length
        const failed = importResults.filter((r) => r.status === "failed").length
        const skipped = importResults.filter(
          (r) => r.status === "skipped_duplicate"
        ).length
        message.success(
          `已提交 ${imported} 篇导入${skipped ? `，${skipped} 篇已存在` : ""}${
            failed ? `，${failed} 篇失败` : ""
          }`
        )
      } catch (error) {
        message.error(error instanceof Error ? error.message : "导入失败")
      } finally {
        setImporting(false)
      }
    },
    [kbId, importing, selection, queryClient]
  )

  return {
    tab,
    setTab,
    driveStack,
    currentDrive,
    driveLoading,
    driveError,
    openDrive,
    goBackDrive,
    spaces,
    spacesLoaded,
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
  }
}

export type FeishuDocPickerState = ReturnType<typeof useFeishuDocPicker>
