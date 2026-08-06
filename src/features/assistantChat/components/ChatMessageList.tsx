import type { RefObject } from "react"
import { RotateCw } from "lucide-react"
import type { AssistantMessage } from "@/api/assistantChat"
import { MarkdownMessageLazy } from "@/components/ui/markdown-message-lazy"
import { LoadingText } from "@/components/ui/loading-text"
import { TypingDots } from "@/components/ui/typing-dots"
import { MessageCitations, openCitationInNewTab } from "@/features/assistantChat/components/MessageCitations"
import { parseMessageContent } from "@/features/assistantChat/lib/parseMessageContent"

type ChatMessageListProps = {
  messagesLoading: boolean
  messagesError: boolean
  selectedConversationId: string
  messages: AssistantMessage[]
  sending: boolean
  streamError: string | null
  bottomRef: RefObject<HTMLDivElement | null>
  onPreviewImage: (image: { url: string; name?: string }) => void
  onResend?: () => void
  onOpenRunTrace?: (runId: string) => void
}

export function ChatMessageList({
  messagesLoading,
  messagesError,
  selectedConversationId,
  messages,
  sending,
  streamError,
  bottomRef,
  onPreviewImage,
  onResend,
  onOpenRunTrace,
}: ChatMessageListProps) {
  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
      {messagesLoading && selectedConversationId ? (
        <LoadingText className="flex w-full">加载中</LoadingText>
      ) : messagesError ? (
        <div className="text-center text-sm text-destructive">加载失败，请检查后端服务</div>
      ) : messages.length ? (
        messages.map((m, index) => {
          const parsed = parseMessageContent(m.content)
          const isLastMessage = index === messages.length - 1
          const showTypingDots = m.role === "assistant" && sending && isLastMessage && !parsed.text
          return (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={[
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                  m.role === "user" ? "whitespace-pre-wrap bg-primary text-primary-foreground" : "bg-muted",
                ].join(" ")}
              >
                {m.role === "assistant" ? (
                  showTypingDots ? (
                    <TypingDots />
                  ) : (
                    <MarkdownMessageLazy
                      content={parsed.text}
                      citationCount={parsed.citations.length}
                      onCitationClick={(citationIndex) => {
                        const citation = parsed.citations[citationIndex]
                        if (citation) openCitationInNewTab(citation)
                      }}
                    />
                  )
                ) : (
                  <div>{parsed.text}</div>
                )}
                {parsed.images.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {parsed.images.map((img, i) => (
                      <button
                        key={`${img.fileName ?? "img"}-${i}`}
                        type="button"
                        className="overflow-hidden rounded-md border"
                        onClick={() => onPreviewImage({ url: img.dataUrl, name: img.fileName })}
                      >
                        <img src={img.dataUrl} alt={img.fileName ?? "图片"} className="h-20 w-20 object-cover" />
                      </button>
                    ))}
                  </div>
                ) : null}
                {parsed.files.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {parsed.files.map((f, i) => (
                      <span key={`${f.fileName}-${i}`} className="rounded border px-2 py-0.5 text-xs opacity-90">
                        {f.fileName}
                      </span>
                    ))}
                  </div>
                ) : null}
                {m.role === "assistant" && !showTypingDots ? <MessageCitations citations={parsed.citations} /> : null}
                {m.role === "assistant" && m.runId && onOpenRunTrace && !showTypingDots ? (
                  <div className="mt-2">
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                      onClick={() => onOpenRunTrace(m.runId!)}
                    >
                      执行详情
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )
        })
      ) : (
        <div className="text-center text-sm text-muted-foreground">开始提问吧</div>
      )}
      {streamError ? (
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-lg bg-destructive/10 px-3 py-2 text-sm leading-relaxed text-destructive">
            <div>{streamError}</div>
            {onResend ? (
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 text-xs hover:bg-destructive/10"
                onClick={() => onResend()}
              >
                <RotateCw className="h-3 w-3" />
                重新发送
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      <div ref={bottomRef} />
    </div>
  )
}
