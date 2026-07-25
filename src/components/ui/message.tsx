import { useEffect, useState } from "react"
import { Check, X } from "lucide-react"

export type MessageVariant = "info" | "success" | "warning" | "error"

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

function push(input: Omit<MessageItem, "id">) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const next: MessageItem = { id, duration: 3000, ...input }
  items = [...items, next]
  emit()
  const duration = next.duration ?? 3000
  if (duration > 0) window.setTimeout(() => remove(id), duration)
  return { id, close: () => remove(id) }
}

export const message = {
  info: (text: string, duration = 3000) => push({ text, variant: "info", duration }),
  success: (text: string, duration = 3000) => push({ text, variant: "success", duration }),
  warning: (text: string, duration = 3000) => push({ text, variant: "warning", duration }),
  error: (text: string, duration = 3000) => push({ text, variant: "error", duration }),
}

function useMessageStore() {
  const [messages, setMessages] = useState<MessageItem[]>(items)

  useEffect(() => {
    listeners.add(setMessages)
    return () => {
      listeners.delete(setMessages)
    }
  }, [])

  return messages
}

const variantConfig = {
  info: { circle: "bg-[#1890ff]", glyph: "!" },
  success: { circle: "bg-[#52c41a]", Icon: Check },
  warning: { circle: "bg-[#fa8c16]", glyph: "!" },
  error: { circle: "bg-[#f5222d]", Icon: X },
} as const

export function MessageCenter() {
  const messages = useMessageStore()
  if (!messages.length) return null

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[120] flex w-[min(88vw,380px)] -translate-x-1/2 flex-col items-center gap-2">
      {messages.map((item) => {
        const config = variantConfig[item.variant]
        return (
          <div
            key={item.id}
            className="pointer-events-auto flex min-w-[240px] items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.1)]"
          >
            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${config.circle}`}>
              {"glyph" in config ? (
                <span className="text-[11px] font-bold leading-none text-white">{config.glyph}</span>
              ) : (
                <config.Icon className="h-3 w-3 text-white" strokeWidth={3} />
              )}
            </div>
            <div className="min-w-0 flex-1 text-sm text-black">{item.text}</div>
          </div>
        )
      })}
    </div>
  )
}
