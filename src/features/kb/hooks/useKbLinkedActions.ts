import { useCallback, useState } from "react"
import type { Kb, KbLinkedAssistant } from "@/api/kb"
import { getKbLinkedAssistants } from "@/api/kb"
import { useDeleteKb, useSetKbEnabled } from "@/features/kb/hooks/queries"

export function useKbLinkedActions() {
  const setEnabled = useSetKbEnabled()
  const deleteKb = useDeleteKb()

  const [deleting, setDeleting] = useState<Kb | null>(null)
  const [deletingLinked, setDeletingLinked] = useState<KbLinkedAssistant[]>([])
  const [disablingKb, setDisablingKb] = useState<Kb | null>(null)
  const [disablingLinked, setDisablingLinked] = useState<KbLinkedAssistant[]>([])
  const [checkingLinked, setCheckingLinked] = useState(false)
  const [linkedCheckError, setLinkedCheckError] = useState<string | null>(null)

  function cancelDelete() {
    setDeleting(null)
    setDeletingLinked([])
  }

  async function confirmDelete() {
    if (!deleting) return

    const id = deleting.id
    const acknowledgeLinked = deletingLinked.length > 0
    cancelDelete()
    try {
      await deleteKb.mutateAsync({
        id,
        acknowledgeLinked,
      })
    } catch {
      // Error toast is handled by the delete mutation.
    }
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

  return {
    setEnabled,
    deleteKb,
    deleting,
    deletingLinked,
    disablingKb,
    disablingLinked,
    checkingLinked,
    linkedCheckError,
    handleDelete,
    handleToggleEnabled,
    cancelDelete,
    confirmDelete,
    cancelDisable,
    confirmDisable,
  }
}
