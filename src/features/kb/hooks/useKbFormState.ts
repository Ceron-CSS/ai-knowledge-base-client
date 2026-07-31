import { useCallback, useMemo, useState } from "react"
import type { Kb } from "@/api/kb"
import { useCreateKb, useUpdateKb } from "@/features/kb/hooks/queries"
import type { KbEditingState } from "@/features/kb/types"

export function useKbFormState() {
  const createKb = useCreateKb()
  const updateKb = useUpdateKb()

  const [editing, setEditing] = useState<KbEditingState>({ mode: "none" })
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

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

  return {
    createKb,
    updateKb,
    editing,
    name,
    setName,
    description,
    setDescription,
    isSaving,
    submitLabel,
    startCreate,
    startEdit,
    cancelEdit,
    submit,
  }
}
