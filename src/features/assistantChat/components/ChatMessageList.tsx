import type { RefObject } from "react"
import type { AssistantMessage } from "@/api/assistantChat"
import { MarkdownMessage } from "@/components/ui/markdown-message"
import { LoadingText } from "@/components/ui/loading-text"
import { parseMessageContent } from "@/features/assistantChat/lib/parseMessageContent"
import type { ParsedCitation } from "@/features/assistantChat/types"

type ChatMessageListProps = {
  messagesLoading: boolean
  messagesError: boolean
  selectedConversationId: string
  messages: AssistantMessage[]
  sending: boolean
  streamError: string | null
  bottomRef: RefObject<HTMLDivElement | null>
  onCitationClick: (index: number, citations: ParsedCitation[], event: React.MouseEvent<HTMLButtonElement>) => void
  onPreviewImage: (image: { url: string; name?: string }) => void
}

export function ChatMessageList({
  messagesLoading,
  messagesError,
  selectedConversationId,
  messages,
  sending,
  streamError,
  bottomRef,
  onCitationClick,
  onPreviewImage,
}: ChatMessageListProps) {
  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
      {messagesLoading && selectedConversationId ? (
        <LoadingText className="flex w-full">加载中</LoadingText>
      ) : messagesError ? (
        <div className="text-center text-sm text-destructive">加载失败，请检查后端服务</div>
      ) : messages.length ? (
        messages.map((m) => {
          const parsed = parseMessageContent(m.content)
          return (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={[
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                  m.role === "user" ? "whitespace-pre-wrap bg-primary text-primary-foreground" : "bg-muted",
                ].join(" ")}
              >
                {m.role === "assistant" ? (
                  <MarkdownMessage
                    content={parsed.text || (sending ? "..." : "")}
                    citationCount={parsed.citations.length}
                    onCitationClick={(index, event) => onCitationClick(index, parsed.citations, event)}
                  />
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
            {streamError}
          </div>
        </div>
      ) : null}
      <div ref={bottomRef} />
    </div>
  )
}
