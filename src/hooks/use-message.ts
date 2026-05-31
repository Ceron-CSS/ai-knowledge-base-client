import { useCallback, useEffect, useState } from "react"

export type MessageVariant = "success" | "error"

export type MessageItem = {
  id: string
  text: string
  variant: MessageVariant
  duration?: number
}

const listeners = new Set<(items: MessageItem[]) => void>()
let items: MessageItem[] = []

function emit() {
  for (const listener of listeners) listener(items)
}

function remove(id: string) {
  items = items.filter((item) => item.id !== id)
  emit()
}

function pushMessage(input: Omit<MessageItem, "id">) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const next: MessageItem = { id, duration: 3000, ...input }
  items = [...items, next]
  emit()
  const duration = next.duration ?? 3000
  if (duration > 0) window.setTimeout(() => remove(id), duration)
  return { id, close: () => remove(id) }
}

export function useMessage() {
  const [messages, setMessages] = useState<MessageItem[]>(items)

  useEffect(() => {
    listeners.add(setMessages)
    return () => { listeners.delete(setMessages) }
  }, [])

  const show = useCallback((text: string, variant: MessageVariant = "success", duration = 3000) => {
    return pushMessage({ text, variant, duration })
  }, [])

  return {
    messages,
    show,
    success: (text: string, duration = 3000) => show(text, "success", duration),
    error: (text: string, duration = 3000) => show(text, "error", duration),
    remove,
  }
}
