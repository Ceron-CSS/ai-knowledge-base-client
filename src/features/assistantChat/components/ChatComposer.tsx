import type { RefObject } from "react"
import { ArrowUp, Plus, Square, X } from "lucide-react"
import { MAX_ATTACHMENT_SIZE } from "@/features/assistantChat/constants/chat"
import { message } from "@/components/ui/message"

type PendingFilePreview = {
  key: string
  url: string | null
}

type ChatComposerProps = {
  input: string
  onInputChange: (value: string) => void
  pendingFiles: File[]
  pendingFilePreviews: PendingFilePreview[]
  onPendingFilesChange: (files: File[]) => void
  composerExpanded: boolean
  sending: boolean
  blockedByUnpublished: boolean
  attachmentInputRef: RefObject<HTMLInputElement | null>
  inputRef: RefObject<HTMLTextAreaElement | null>
  onAdjustComposerHeight: (textarea: HTMLTextAreaElement) => void
  onSend: () => void
  onStop?: () => void
  onPreviewImage: (image: { url: string; name?: string }) => void
}

export function ChatComposer({
  input,
  onInputChange,
  pendingFiles,
  pendingFilePreviews,
  onPendingFilesChange,
  composerExpanded,
  sending,
  blockedByUnpublished,
  attachmentInputRef,
  inputRef,
  onAdjustComposerHeight,
  onSend,
  onStop,
  onPreviewImage,
}: ChatComposerProps) {
  function removePendingFile(file: File) {
    onPendingFilesChange(pendingFiles.filter((x) => !(x.name === file.name && x.lastModified === file.lastModified)))
  }

  function handleAttachmentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const accepted = files.filter((f) => f.size <= MAX_ATTACHMENT_SIZE)
    const rejected = files.length - accepted.length
    if (rejected > 0) {
      message.error(rejected === 1 ? "文件不能超过 5MB" : `${rejected} 个文件超过 5MB，已忽略`, 3000)
    }
    if (accepted.length) onPendingFilesChange([...pendingFiles, ...accepted])
    e.currentTarget.value = ""
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!sending) void onSend()
    }
  }

  const sendDisabled = blockedByUnpublished || sending || (!input.trim() && !pendingFiles.length)

  function renderActionButton(className: string) {
    if (sending) {
      return (
        <button
          type="button"
          className={className}
          onClick={() => onStop?.()}
          title="停止生成"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
        </button>
      )
    }
    return (
      <button
        type="button"
        className={className}
        onClick={() => void onSend()}
        disabled={sendDisabled}
        title="发送"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div className="border-t p-3">
      {pendingFiles.length ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {pendingFiles.map((file) => (
            <div key={`${file.name}-${file.lastModified}`} className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
              {file.type.startsWith("image/") ? (
                <div className="relative">
                  <button
                    type="button"
                    className="overflow-hidden rounded border"
                    onClick={() => {
                      const preview = pendingFilePreviews.find((x) => x.key === `${file.name}-${file.lastModified}`)
                      if (preview?.url) onPreviewImage({ url: preview.url, name: file.name })
                    }}
                  >
                    <img
                      src={pendingFilePreviews.find((x) => x.key === `${file.name}-${file.lastModified}`)?.url ?? ""}
                      alt={file.name}
                      className="h-10 w-10 object-cover"
                    />
                  </button>
                  <button
                    type="button"
                    className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                    onClick={() => removePendingFile(file)}
                    title="删除图片"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="max-w-[220px] truncate">{file.name}</span>
                  <button type="button" className="rounded border px-1 hover:bg-muted/60" onClick={() => removePendingFile(file)}>
                    <X className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : null}

      <div className={`rounded-2xl border bg-background px-3 ${composerExpanded ? "py-3" : "py-2"}`}>
        <input
          ref={attachmentInputRef}
          type="file"
          accept="image/*,.txt,.md,.markdown,.pdf,.docx"
          className="hidden"
          onChange={handleAttachmentChange}
        />
        {!composerExpanded ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-muted/60"
              onClick={() => attachmentInputRef.current?.click()}
              title="添加附件"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <textarea
                ref={inputRef}
                className="block min-h-[36px] w-full resize-none bg-transparent px-0 py-0 text-sm leading-9 outline-none"
                placeholder="有问题，尽管问"
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onInput={(e) => onAdjustComposerHeight(e.currentTarget)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
            </div>
            {renderActionButton(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-50",
            )}
          </div>
        ) : (
          <>
            <div className="min-w-0">
              <textarea
                ref={inputRef}
                className="block min-h-[36px] w-full resize-none bg-transparent px-0 py-1 text-sm leading-6 outline-none"
                placeholder="输入消息，Enter 发送，Shift+Enter 换行"
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onInput={(e) => onAdjustComposerHeight(e.currentTarget)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
            </div>
            <div className="mt-1 flex items-center justify-between">
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-muted/60"
                onClick={() => attachmentInputRef.current?.click()}
                title="添加附件"
              >
                <Plus className="h-4 w-4" />
              </button>
              {renderActionButton(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-50",
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
