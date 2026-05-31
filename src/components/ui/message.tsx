import { CircleCheck, CircleX } from "lucide-react"
import { useMessage } from "@/hooks/use-message"

export function MessageCenter() {
  const { messages } = useMessage()
  if (!messages.length) return null

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[120] w-[min(88vw,380px)] -translate-x-1/2 space-y-2">
      {messages.map((item) => {
        const isError = item.variant === "error"
        return (
          <div
            key={item.id}
            className={[
              "pointer-events-auto flex items-center gap-2 rounded-sm border px-3 py-2 shadow-sm",
              isError ? "border-[#fbc4c4] bg-[#fef0f0] text-[#f56c6c]" : "border-[#c2e7b0] bg-[#f0f9eb] text-[#67c23a]",
            ].join(" ")}
          >
            {isError ? <CircleX className="h-4 w-4 shrink-0" /> : <CircleCheck className="h-4 w-4 shrink-0" />}
            <div className="min-w-0 flex-1 truncate text-sm">{item.text}</div>
          </div>
        )
      })}
    </div>
  )
}
