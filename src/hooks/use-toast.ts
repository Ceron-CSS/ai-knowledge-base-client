import { useCallback, useEffect, useState } from "react"

export type ToastItem = {
  id: string
  title?: string
  description?: string
  duration?: number
  variant?: "default" | "destructive"
}

const listeners = new Set<(toasts: ToastItem[]) => void>()
let toasts: ToastItem[] = []

function emit() {
  for (const listener of listeners) listener(toasts)
}

function dismiss(id: string) {
  toasts = toasts.filter((toast) => toast.id !== id)
  emit()
}

function createToast(input: Omit<ToastItem, "id">) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const next: ToastItem = { id, duration: 3000, variant: "default", ...input }
  toasts = [...toasts, next]
  emit()
  const duration = next.duration ?? 3000
  if (duration > 0) {
    window.setTimeout(() => dismiss(id), duration)
  }
  return { id, dismiss: () => dismiss(id) }
}

export function useToast() {
  const [items, setItems] = useState<ToastItem[]>(toasts)

  useEffect(() => {
    listeners.add(setItems)
    return () => {
      listeners.delete(setItems)
    }
  }, [])

  const toast = useCallback((input: Omit<ToastItem, "id">) => createToast(input), [])
  const remove = useCallback((id: string) => dismiss(id), [])

  return { toast, toasts: items, dismiss: remove }
}
