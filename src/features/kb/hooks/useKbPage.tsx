import { useCallback, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FolderOpen, Pencil, Trash2 } from "lucide-react"
import type { Kb, KbLinkedAssistant } from "@/api/kb"
import { getKbLinkedAssistants } from "@/api/kb"
import { Button } from "@/components/ui/button"
import type { DataTableColumn } from "@/components/ui/data-table"
import { Switch } from "@/components/ui/switch"
import {
  useCreateKb,
  useDeleteKb,
  useKbList,
  useSetKbEnabled,
  useUpdateKb,
} from "@/features/kb/hooks/queries"
import { filterKbList } from "@/features/kb/lib/filterKbList"
import { formatCharCountK } from "@/features/kb/lib/formatCharCountK"
import type { KbEditingState } from "@/features/kb/types"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"

export function useKbPage() {
  const navigate = useNavigate()

  const kbList = useKbList()
  const createKb = useCreateKb()
  const updateKb = useUpdateKb()
  const setEnabled = useSetKbEnabled()
  const deleteKb = useDeleteKb()

  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query, 250)
  const [editing, setEditing] = useState<KbEditingState>({ mode: "none" })
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [deleting, setDeleting] = useState<Kb | null>(null)
  const [deletingLinked, setDeletingLinked] = useState<KbLinkedAssistant[]>([])
  const [disablingKb, setDisablingKb] = useState<Kb | null>(null)
  const [disablingLinked, setDisablingLinked] = useState<KbLinkedAssistant[]>([])
  const [checkingLinked, setCheckingLinked] = useState(false)
  const [linkedCheckError, setLinkedCheckError] = useState<string | null>(null)

  const isSaving = createKb.isPending || updateKb.isPending

  const submitLabel = useMemo(() => {
    if (editing.mode === "create") return "新建"
    if (editing.mode === "edit") return "保存"
    return "提交"
  }, [editing.mode])

  function startCreate() {
    setEditing({ mode: "create" })
    setName("")
    setDescription("")
  }

  const startEdit = useCallback((kb: Kb) => {
    setEditing({ mode: "edit", kb })
    setName(kb.name)
    setDescription(kb.description ?? "")
  }, [])

  function cancelEdit() {
    setEditing({ mode: "none" })
    setName("")
    setDescription("")
  }

  function cancelDelete() {
    setDeleting(null)
    setDeletingLinked([])
  }

  async function submit() {
    const trimmedName = name.trim()
    if (!trimmedName) return

    if (editing.mode === "create") {
      await createKb.mutateAsync({
        name: trimmedName,
        description: description.trim() ? description.trim() : undefined,
      })
      cancelEdit()
      return
    }

    if (editing.mode === "edit") {
      await updateKb.mutateAsync({
        id: editing.kb.id,
        body: {
          name: trimmedName,
          description: description.trim() ? description.trim() : undefined,
        },
      })
      cancelEdit()
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    await deleteKb.mutateAsync({
      id: deleting.id,
      acknowledgeLinked: deletingLinked.length > 0,
    })
    cancelDelete()
  }

  const handleDelete = useCallback(async (kb: Kb) => {
    setCheckingLinked(true)
    setLinkedCheckError(null)
    try {
      const linked = await getKbLinkedAssistants(kb.id)
      setDeleting(kb)
      setDeletingLinked(linked)
    } catch {
      setLinkedCheckError("无法检查关联助手，请稍后重试")
    } finally {
      setCheckingLinked(false)
    }
  }, [])

  const handleToggleEnabled = useCallback(
    async (kb: Kb) => {
      if (kb.enabled) {
        setCheckingLinked(true)
        setLinkedCheckError(null)
        try {
          const linked = await getKbLinkedAssistants(kb.id)
          if (linked.length) {
            setDisablingKb(kb)
            setDisablingLinked(linked)
          } else {
            setEnabled.mutate({ id: kb.id, enabled: false })
          }
        } catch {
          setLinkedCheckError("无法检查关联助手，请稍后重试")
        } finally {
          setCheckingLinked(false)
        }
      } else {
        setEnabled.mutate({ id: kb.id, enabled: true })
      }
    },
    [setEnabled],
  )

  function cancelDisable() {
    setDisablingKb(null)
    setDisablingLinked([])
  }

  function confirmDisable() {
    if (!disablingKb) return
    setEnabled.mutate({
      id: disablingKb.id,
      enabled: false,
      acknowledgeLinked: true,
    })
    cancelDisable()
  }

  const filteredList = useMemo(
    () => filterKbList(kbList.data ?? [], debouncedQuery),
    [kbList.data, debouncedQuery],
  )

  const countLabel = useMemo(() => {
    const total = kbList.data?.length ?? 0
    const filtered = filteredList.length
    const q = debouncedQuery.trim()
    if (q) return `${filtered}/${total} 个知识库`
    return `${total} 个知识库`
  }, [kbList.data?.length, filteredList.length, debouncedQuery])

  const columns = useMemo<Array<DataTableColumn<Kb>>>(
    () => [
      {
        key: "name",
        header: "名称",
        className: "w-[10%]",
        render: (kb) => (
          <Button
            variant="link"
            className="h-auto max-w-[18rem] truncate px-0 font-normal hover:no-underline"
            onClick={() => navigate(`/kb/${kb.id}`)}
            title={kb.name}
          >
            {kb.name}
          </Button>
        ),
      },
      {
        key: "description",
        header: "描述",
        className: "w-[18%]",
        cellClassName: "text-muted-foreground",
        render: (kb) => (
          <div className="max-w-[28rem] truncate" title={kb.description || ""}>
            {kb.description || "-"}
          </div>
        ),
      },
      {
        key: "docCount",
        header: "文档数",
        className: "w-[6%]",
        cellClassName: "tabular-nums",
        render: (kb) => kb.docCount,
      },
      {
        key: "charCount",
        header: "字符",
        className: "w-[7%]",
        cellClassName: "tabular-nums",
        render: (kb) => formatCharCountK(kb.charCount),
      },
      {
        key: "createdAt",
        header: "创建时间",
        className: "w-[14%]",
        cellClassName: "tabular-nums text-muted-foreground",
        render: (kb) => new Date(kb.createdAt).toLocaleString(),
      },
      {
        key: "updatedAt",
        header: "修改时间",
        className: "w-[14%]",
        cellClassName: "tabular-nums text-muted-foreground",
        render: (kb) => new Date(kb.updatedAt).toLocaleString(),
      },
      {
        key: "enabled",
        header: "状态",
        className: "w-[8%]",
        render: (kb) => (
          <Switch
            checked={kb.enabled}
            size="sm"
            disabled={setEnabled.isPending || checkingLinked}
            aria-label={kb.enabled ? "停用知识库" : "启用知识库"}
            title={kb.enabled ? "停用" : "启用"}
            onCheckedChange={() => void handleToggleEnabled(kb)}
          />
        ),
      },
      {
        key: "actions",
        header: "操作",
        className: "w-[12%] text-center",
        cellClassName: "text-center",
        render: (kb) => (
          <>
            <div className="inline-flex items-center justify-center gap-0.5 whitespace-nowrap">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => navigate(`/kb/${kb.id}`)}
                disabled={deleteKb.isPending}
                title="管理"
                aria-label="管理"
              >
                <FolderOpen />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => startEdit(kb)}
                disabled={setEnabled.isPending}
                title="设置"
                aria-label="设置"
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void handleDelete(kb)}
                disabled={setEnabled.isPending || deleteKb.isPending || checkingLinked}
                title="删除"
                aria-label="删除"
              >
                <Trash2 />
              </Button>
            </div>
            {setEnabled.isError ? <div className="mt-2 text-xs text-destructive">启停失败，请重试</div> : null}
          </>
        ),
      },
    ],
    [
      checkingLinked,
      deleteKb.isPending,
      handleDelete,
      handleToggleEnabled,
      navigate,
      setEnabled.isError,
      setEnabled.isPending,
      startEdit,
    ],
  )

  return {
    query,
    setQuery,
    editing,
    name,
    setName,
    description,
    setDescription,
    deleting,
    deletingLinked,
    disablingKb,
    disablingLinked,
    linkedCheckError,
    isSaving,
    submitLabel,
    filteredList,
    countLabel,
    columns,
    kbList,
    createKb,
    updateKb,
    deleteKb,
    setEnabled,
    startCreate,
    cancelEdit,
    cancelDelete,
    cancelDisable,
    submit: () => void submit(),
    confirmDelete: () => void confirmDelete(),
    confirmDisable,
  }
}
