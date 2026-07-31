import { useMemo, useState } from "react"
import { DEFAULT_PAGE_SIZE } from "@/api/listQuery"
import { useKbList } from "@/features/kb/hooks/queries"
import { useKbFormState } from "@/features/kb/hooks/useKbFormState"
import { useKbLinkedActions } from "@/features/kb/hooks/useKbLinkedActions"
import { useKbTableColumns } from "@/features/kb/hooks/useKbTableColumns"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"

export function useKbPage() {
  const form = useKbFormState()
  const actions = useKbLinkedActions()

  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query, 250)
  const [page, setPage] = useState(1)
  const [pageQuery, setPageQuery] = useState(debouncedQuery)
  if (pageQuery !== debouncedQuery) {
    setPageQuery(debouncedQuery)
    setPage(1)
  }

  const listParams = useMemo(
    () => ({
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      ...(debouncedQuery.trim() ? { q: debouncedQuery.trim() } : {}),
      sortBy: "createdAt" as const,
      sortDir: "desc" as const,
    }),
    [page, debouncedQuery],
  )

  const kbList = useKbList(listParams)
  const list = kbList.data?.items ?? []
  const total = kbList.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE))
  if (kbList.data && page > totalPages) {
    setPage(totalPages)
  }

  const countLabel = useMemo(() => {
    const q = debouncedQuery.trim()
    if (q) return `${list.length}/${total} 个知识库`
    return `${total} 个知识库`
  }, [list.length, total, debouncedQuery])

  const columns = useKbTableColumns({
    onEdit: form.startEdit,
    onDelete: actions.handleDelete,
    onToggleEnabled: actions.handleToggleEnabled,
    setEnabledPending: actions.setEnabled.isPending,
    setEnabledError: actions.setEnabled.isError,
    deletePending: actions.deleteKb.isPending,
    checkingLinked: actions.checkingLinked,
  })

  return {
    query,
    setQuery,
    page,
    setPage,
    pageSize: DEFAULT_PAGE_SIZE,
    total,
    editing: form.editing,
    name: form.name,
    setName: form.setName,
    description: form.description,
    setDescription: form.setDescription,
    deleting: actions.deleting,
    deletingLinked: actions.deletingLinked,
    disablingKb: actions.disablingKb,
    disablingLinked: actions.disablingLinked,
    linkedCheckError: actions.linkedCheckError,
    isSaving: form.isSaving,
    submitLabel: form.submitLabel,
    filteredList: list,
    countLabel,
    columns,
    kbList,
    createKb: form.createKb,
    updateKb: form.updateKb,
    deleteKb: actions.deleteKb,
    setEnabled: actions.setEnabled,
    startCreate: form.startCreate,
    cancelEdit: form.cancelEdit,
    cancelDelete: actions.cancelDelete,
    cancelDisable: actions.cancelDisable,
    submit: () => void form.submit(),
    confirmDelete: () => void actions.confirmDelete(),
    confirmDisable: actions.confirmDisable,
  }
}
