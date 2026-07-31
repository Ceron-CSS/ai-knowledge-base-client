import { useMemo, useState } from "react"
import { useKbList } from "@/features/kb/hooks/queries"
import { useKbFormState } from "@/features/kb/hooks/useKbFormState"
import { useKbLinkedActions } from "@/features/kb/hooks/useKbLinkedActions"
import { useKbTableColumns } from "@/features/kb/hooks/useKbTableColumns"
import { filterKbList } from "@/features/kb/lib/filterKbList"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"

export function useKbPage() {
  const kbList = useKbList()
  const form = useKbFormState()
  const actions = useKbLinkedActions()

  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query, 250)

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
    filteredList,
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
