import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { ArrowUp, Check, MessageCirclePlus, Pencil, Plus, Trash2, X } from "lucide-react"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { MarkdownMessage } from "@/components/ui/markdown-message"
import { LoadingText } from "@/components/ui/loading-text"
import {
  streamAssistantReply,
  uploadAssistantFileForExtraction,
  uploadAssistantImageAttachment,
  type AssistantAttachment,
  type AssistantConversation,
  type AssistantMessage,
} from "@/api/assistantChat"
import { useAssistant } from "@/features/assistants"
import {
  useAssistantConversations,
  useAssistantMessages,
  useCreateAssistantConversation,
  useDeleteAssistantConversation,
  useRenameAssistantConversation,
} from "@/features/assistantChat/queries"
import { useQueryClient } from "@tanstack/react-query"
import { useDebouncedValue } from "@/lib/useDebouncedValue"
import { message } from "@/components/ui/message"

const ATTACHMENT_META_SEPARATOR = "\n\n<assistant-attachments-meta>"
const ATTACHMENT_META_END = "</assistant-attachments-meta>"
const CITATION_META_SEPARATOR = "\n\n<assistant-citations-meta>"
const CITATION_META_END = "</assistant-citations-meta>"
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024
const MIN_COMPOSER_HEIGHT = 36
const MAX_COMPOSER_HEIGHT = 160

type ParsedImageAttachment = { kind: "image"; fileName?: string; dataUrl: string }
type ParsedFileAttachment = { kind: "file"; fileName: string }
type ParsedCitation = { kbId: string; itemId: string; fileName: string; snippet: string; score: number }
type ActiveCitation = { index: number; citation: ParsedCitation; top: number; left: number }

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function normalizeConversationTitle(title: string): string {
  const value = title.trim()
  if (!value) return "新对话"
  if (/\uFFFD/.test(value)) return "新对话"
  return value
}

function parseMessageContent(content: string): {
  text: string
  images: ParsedImageAttachment[]
  files: ParsedFileAttachment[]
  citations: ParsedCitation[]
} {
  const citationStart = content.indexOf(CITATION_META_SEPARATOR)
  let baseContent = content
  let citations: ParsedCitation[] = []
  if (citationStart !== -1) {
    const citationEnd = content.indexOf(CITATION_META_END, citationStart + CITATION_META_SEPARATOR.length)
    if (citationEnd !== -1) {
      baseContent = content.slice(0, citationStart)
      const citationRaw = content.slice(citationStart + CITATION_META_SEPARATOR.length, citationEnd).trim()
      try {
        const parsed = JSON.parse(citationRaw) as unknown
        if (Array.isArray(parsed)) {
          citations = parsed
            .filter((item): item is ParsedCitation => {
              if (!item || typeof item !== "object") return false
              const v = item as Record<string, unknown>
              return (
                typeof v.kbId === "string" &&
                typeof v.itemId === "string" &&
                typeof v.fileName === "string" &&
                typeof v.snippet === "string" &&
                typeof v.score === "number"
              )
            })
            .slice(0, 8)
        }
      } catch {
        citations = []
      }
    }
  }

  const start = baseContent.indexOf(ATTACHMENT_META_SEPARATOR)
  if (start === -1) return { text: baseContent, images: [], files: [], citations }
  const end = baseContent.indexOf(ATTACHMENT_META_END, start + ATTACHMENT_META_SEPARATOR.length)
  if (end === -1) return { text: baseContent, images: [], files: [], citations }
  const text = baseContent.slice(0, start)
  const raw = baseContent.slice(start + ATTACHMENT_META_SEPARATOR.length, end).trim()
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return { text, images: [], files: [], citations }
    const images: ParsedImageAttachment[] = []
    const files: ParsedFileAttachment[] = []
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue
      const maybe = item as Record<string, unknown>
      if (maybe.kind === "image" && typeof maybe.dataUrl === "string") {
        images.push({
          kind: "image",
          fileName: typeof maybe.fileName === "string" ? maybe.fileName : undefined,
          dataUrl: maybe.dataUrl,
        })
      }
      if (maybe.kind === "file" && typeof maybe.fileName === "string") {
        files.push({ kind: "file", fileName: maybe.fileName })
      }
    }
    return { text, images, files, citations }
  } catch {
    return { text, images: [], files: [], citations }
  }
}

export function AssistantChatPage() {
  const params = useParams()
  const assistantId = params.id ?? ""
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedConversationId = searchParams.get("c") ?? ""

  const qc = useQueryClient()
  const assistant = useAssistant(assistantId, !!assistantId)

  const [conversationQuery, setConversationQuery] = useState("")
  const debouncedConversationQuery = useDebouncedValue(conversationQuery, 250)

  const [input, setInput] = useState("")
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [pendingUser, setPendingUser] = useState<AssistantMessage | null>(null)
  const [pendingAssistant, setPendingAssistant] = useState<AssistantMessage | null>(null)
  const [previewImage, setPreviewImage] = useState<{ url: string; name?: string } | null>(null)
  const [activeCitation, setActiveCitation] = useState<ActiveCitation | null>(null)
  const [composerExpanded, setComposerExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<AssistantConversation | null>(null)
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")

  const typewriterQueueRef = useRef("")
  const typewriterTextRef = useRef("")
  const typewriterTimerRef = useRef<number | null>(null)
  const attachmentInputRef = useRef<HTMLInputElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const conversations = useAssistantConversations(assistantId)
  const createConversation = useCreateAssistantConversation(assistantId)
  const deleteConversation = useDeleteAssistantConversation(assistantId)
  const renameConversation = useRenameAssistantConversation(assistantId)
  const messagesQuery = useAssistantMessages(assistantId, selectedConversationId, !!selectedConversationId)
  const baseMessages = messagesQuery.data ?? []

  const allList = conversations.data ?? []
  const list = useMemo(() => {
    const q = debouncedConversationQuery.trim().toLowerCase()
    if (!q) return allList
    return allList.filter((x) => (x.title ?? "").toLowerCase().includes(q))
  }, [allList, debouncedConversationQuery])
  const selectedConversation = useMemo(() => allList.find((x) => x.id === selectedConversationId) ?? null, [allList, selectedConversationId])

  const combinedMessages = useMemo(() => {
    const output = [...baseMessages]
    if (pendingUser) output.push(pendingUser)
    if (pendingAssistant) output.push(pendingAssistant)
    return output
  }, [baseMessages, pendingUser, pendingAssistant])

  const pendingFilePreviews = useMemo(
    () =>
      pendingFiles.map((file) => ({
        key: `${file.name}-${file.lastModified}`,
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    [pendingFiles],
  )

  useEffect(() => {
    return () => {
      for (const item of pendingFilePreviews) if (item.url) URL.revokeObjectURL(item.url)
    }
  }, [pendingFilePreviews])

  const bottomRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [combinedMessages.length, pendingAssistant?.content])

  useEffect(
    () => () => {
      if (typewriterTimerRef.current !== null) {
        window.clearInterval(typewriterTimerRef.current)
        typewriterTimerRef.current = null
      }
    },
    [],
  )

  function adjustComposerHeight(textarea: HTMLTextAreaElement) {
    textarea.style.height = "auto"
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, MIN_COMPOSER_HEIGHT), MAX_COMPOSER_HEIGHT)
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > MAX_COMPOSER_HEIGHT ? "auto" : "hidden"
    setComposerExpanded(nextHeight > MIN_COMPOSER_HEIGHT)
  }

  useEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return
    adjustComposerHeight(textarea)
  }, [input])

  useEffect(() => {
    if (!assistantId || conversations.isLoading || createConversation.isPending || selectedConversationId || !allList.length) return
    setSearchParams({ c: allList[0].id }, { replace: true })
  }, [assistantId, conversations.isLoading, createConversation.isPending, selectedConversationId, allList, setSearchParams])

  function stopTypewriter() {
    typewriterQueueRef.current = ""
    if (typewriterTimerRef.current !== null) {
      window.clearInterval(typewriterTimerRef.current)
      typewriterTimerRef.current = null
    }
  }

  function flushTypewriterQueue() {
    const q = typewriterQueueRef.current
    if (!q) return
    typewriterQueueRef.current = ""
    typewriterTextRef.current += q
    setPendingAssistant((prev) => (prev ? { ...prev, content: typewriterTextRef.current } : prev))
  }

  function startTypewriter() {
    if (typewriterTimerRef.current !== null) return
    typewriterTimerRef.current = window.setInterval(() => {
      const q = typewriterQueueRef.current
      if (!q) return
      const maxChars = q.length > 2000 ? 120 : q.length > 1000 ? 80 : q.length > 400 ? 40 : q.length > 150 ? 20 : 8
      const chunk = q.slice(0, maxChars)
      typewriterQueueRef.current = q.slice(maxChars)
      typewriterTextRef.current += chunk
      setPendingAssistant((prev) => (prev ? { ...prev, content: typewriterTextRef.current } : prev))
    }, 16)
  }

  function openCitationPopover(index: number, citations: ParsedCitation[], event: React.MouseEvent<HTMLButtonElement>) {
    const citation = citations[index]
    if (!citation) return
    const rect = event.currentTarget.getBoundingClientRect()
    const width = 520
    const left = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - width - 12))
    const top = Math.min(rect.bottom + 8, Math.max(12, window.innerHeight - 480))
    setActiveCitation({ index, citation, left, top })
  }

  const blockedByUnpublished = !assistant.isLoading && !!assistant.data && !assistant.data.publishedAt

  async function startNewConversation() {
    if (blockedByUnpublished) {
      message.error("该问答助手尚未发布，无法新建对话", 3000)
      return
    }
    const created = await createConversation.mutateAsync()
    setSearchParams({ c: created.id }, { replace: false })
  }

  async function onDeleteConversation() {
    if (!confirmDelete) return
    const idToDelete = confirmDelete.id
    setConfirmDelete(null)
    await deleteConversation.mutateAsync({ conversationId: idToDelete })
    if (selectedConversationId === idToDelete) setSearchParams({}, { replace: true })
  }

  function startRenameConversation(c: AssistantConversation) {
    setEditingConversationId(c.id)
    setEditingTitle(normalizeConversationTitle(c.title))
  }

  async function submitRenameConversation(conversationId: string) {
    const nextTitle = editingTitle.trim()
    if (!nextTitle) return
    await renameConversation.mutateAsync({ conversationId, title: nextTitle })
    setEditingConversationId(null)
    setEditingTitle("")
  }

  async function send() {
    if (blockedByUnpublished) {
      message.error("该问答助手尚未发布，无法发送消息", 3000)
      return
    }
    const text = input.trim()
    const hasFiles = pendingFiles.length > 0
    if (!text && !hasFiles) return
    if (!assistantId) return

    setStreamError(null)
    setSending(true)
    stopTypewriter()

    const imageFiles = pendingFiles.filter((f) => f.type.startsWith("image/"))
    const nonImageFiles = pendingFiles.filter((f) => !f.type.startsWith("image/"))
    const isVisionModel = (assistant.data?.baseModel?.trim() ?? "").startsWith("qwen-vl-")
    if (imageFiles.length && !isVisionModel) {
      setSending(false)
      message.error("当前模型不支持图片理解，请切换到 qwen-vl-* 模型", 3000)
      return
    }

    let conversationId = selectedConversationId
    if (!conversationId) {
      const created = await createConversation.mutateAsync()
      conversationId = created.id
      setSearchParams({ c: created.id }, { replace: true })
    }

    const userText = text || "请分析我上传的附件"
    const attachmentSummary = pendingFiles.length ? `\n\n[已上传附件 ${pendingFiles.length} 个：${pendingFiles.map((f) => f.name).join("、")}]` : ""
    setPendingUser({
      id: `temp-user-${Date.now()}`,
      conversationId,
      role: "user",
      content: `${userText}${attachmentSummary}`,
      createdAt: new Date().toISOString(),
    })
    setPendingAssistant({
      id: `temp-assistant-${Date.now()}`,
      conversationId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    })
    setInput("")
    setPendingFiles([])
    typewriterTextRef.current = ""

    try {
      const attachments: AssistantAttachment[] = []
      for (const imageFile of imageFiles) {
        attachments.push(await uploadAssistantImageAttachment({ assistantId, conversationId, file: imageFile }))
      }
      for (const file of nonImageFiles) {
        attachments.push(await uploadAssistantFileForExtraction({ assistantId, conversationId, file }))
      }

      const stream = await streamAssistantReply({ assistantId, conversationId, text: userText, attachments, signal: new AbortController().signal })
      for await (const ev of stream) {
        if (ev.type === "delta") {
          typewriterQueueRef.current += ev.delta
          startTypewriter()
        } else if (ev.type === "error") {
          flushTypewriterQueue()
          stopTypewriter()
          if (ev.saved) {
            await Promise.all([
              qc.invalidateQueries({ queryKey: ["assistantChat", assistantId, "conversations"] }),
              qc.invalidateQueries({ queryKey: ["assistantChat", assistantId, "conversations", conversationId, "messages"] }),
            ])
            setPendingAssistant(null)
            setPendingUser(null)
            setStreamError(null)
          } else {
            setStreamError(ev.message || "请求失败")
          }
        } else {
          flushTypewriterQueue()
          stopTypewriter()
          await Promise.all([
            qc.invalidateQueries({ queryKey: ["assistantChat", assistantId, "conversations"] }),
            qc.invalidateQueries({ queryKey: ["assistantChat", assistantId, "conversations", conversationId, "messages"] }),
          ])
          setPendingAssistant(null)
          setPendingUser(null)
        }
      }
    } catch (e) {
      stopTypewriter()
      setStreamError(e instanceof Error ? e.message : "请求失败")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-[calc(100svh-3rem)] min-h-[600px] flex-col gap-2">
      <Breadcrumb items={[{ label: "问答助手", href: "/assistants" }, { label: "对话" }]} />
      <div className="flex min-h-0 flex-1 gap-4">
        <aside className="flex w-72 shrink-0 flex-col rounded-lg border bg-background">
          <div className="border-b p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 truncate text-sm font-medium" title={assistant.data?.name ?? ""}>
                {assistant.isLoading ? <LoadingText className="justify-start">加载中</LoadingText> : assistant.data?.name ?? "问答助手"}
              </div>
              <button className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted/60" onClick={startNewConversation} disabled={createConversation.isPending} title="新对话">
                <MessageCirclePlus className="h-4 w-4" />新对话
              </button>
            </div>
            <div className="mt-2">
              <Input
                clearable
                className="w-full min-w-0"
                value={conversationQuery}
                onChange={(e) => setConversationQuery(e.target.value)}
                placeholder="搜索标题"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-2">
            {conversations.isLoading ? <LoadingText className="flex px-2 py-6">加载中</LoadingText> : conversations.isError ? <div className="px-2 py-6 text-center text-sm text-destructive">加载失败：请检查后端服务</div> : list.length ? (
              <div className="space-y-1">
                {list.map((c) => {
                  const active = c.id === selectedConversationId
                  return (
                    <div key={c.id} className={["group flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm", active ? "bg-muted font-medium" : "hover:bg-muted/60"].join(" ")} onClick={() => editingConversationId !== c.id && setSearchParams({ c: c.id }, { replace: false })}>
                      <div className="min-w-0 flex-1">
                        {editingConversationId === c.id ? (
                          <div className="flex w-full min-w-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input className="min-w-0 flex-1 rounded border bg-background px-2 py-1 text-xs outline-none focus:ring-2" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} autoFocus />
                            <button type="button" className="inline-flex shrink-0 rounded border px-1 py-1 hover:bg-muted/60" onClick={() => void submitRenameConversation(c.id)}><Check className="h-3.5 w-3.5" /></button>
                            <button type="button" className="inline-flex shrink-0 rounded border px-1 py-1 hover:bg-muted/60" onClick={() => { setEditingConversationId(null); setEditingTitle("") }}><X className="h-3.5 w-3.5" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <div className="truncate">{normalizeConversationTitle(c.title)}</div>
                            <button type="button" className="inline-flex rounded border px-1 py-1 text-xs opacity-0 transition-opacity hover:bg-muted/60 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); startRenameConversation(c) }} title="重命名">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        <div className="mt-0.5 text-xs text-muted-foreground">{formatTime(c.updatedAt)}</div>
                      </div>
                      {editingConversationId !== c.id ? (
                        <button className="hidden rounded-md border px-2 py-1 text-xs text-destructive hover:bg-destructive/10 group-hover:inline-flex" onClick={(e) => { e.stopPropagation(); setConfirmDelete(c) }} title="删除">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : allList.length ? <div className="px-2 py-6 text-center text-sm text-muted-foreground">无匹配结果</div> : <div className="px-2 py-6 text-center text-sm text-muted-foreground">暂无对话，点击右上角开始</div>}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col rounded-lg border bg-background">
          <div className="border-b p-3">
            <div className="text-sm font-medium">{selectedConversation ? normalizeConversationTitle(selectedConversation.title) : "对话"}</div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
            {messagesQuery.isLoading && selectedConversationId ? <LoadingText className="flex w-full">加载中</LoadingText> : messagesQuery.isError ? <div className="text-center text-sm text-destructive">加载失败，请检查后端服务</div> : combinedMessages.length ? combinedMessages.map((m) => {
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
                        onCitationClick={(index, event) => openCitationPopover(index, parsed.citations, event)}
                      />
                    ) : (
                      <div>{parsed.text}</div>
                    )}
                    {parsed.images.length ? <div className="mt-2 flex flex-wrap gap-2">{parsed.images.map((img, i) => <button key={`${img.fileName ?? "img"}-${i}`} type="button" className="overflow-hidden rounded-md border" onClick={() => setPreviewImage({ url: img.dataUrl, name: img.fileName })}><img src={img.dataUrl} alt={img.fileName ?? "图片"} className="h-20 w-20 object-cover" /></button>)}</div> : null}
                    {parsed.files.length ? <div className="mt-2 flex flex-wrap gap-1.5">{parsed.files.map((f, i) => <span key={`${f.fileName}-${i}`} className="rounded border px-2 py-0.5 text-xs opacity-90">{f.fileName}</span>)}</div> : null}
                  </div>
                </div>
              )
            }) : <div className="text-center text-sm text-muted-foreground">开始提问吧</div>}
            {streamError ? (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg bg-destructive/10 px-3 py-2 text-sm leading-relaxed text-destructive">
                  {streamError}
                </div>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <div className="border-t p-3">
            {pendingFiles.length ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {pendingFiles.map((file) => (
                  <div key={`${file.name}-${file.lastModified}`} className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
                    {file.type.startsWith("image/") ? (
                      <div className="relative">
                        <button type="button" className="overflow-hidden rounded border" onClick={() => {
                          const preview = pendingFilePreviews.find((x) => x.key === `${file.name}-${file.lastModified}`)
                          if (preview?.url) setPreviewImage({ url: preview.url, name: file.name })
                        }}>
                          <img src={pendingFilePreviews.find((x) => x.key === `${file.name}-${file.lastModified}`)?.url ?? ""} alt={file.name} className="h-10 w-10 object-cover" />
                        </button>
                        <button type="button" className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black" onClick={() => setPendingFiles((prev) => prev.filter((x) => !(x.name === file.name && x.lastModified === file.lastModified)))} title="删除图片"><X className="h-3 w-3" /></button>
                      </div>
                    ) : (
                      <>
                        <span className="max-w-[220px] truncate">{file.name}</span>
                        <button type="button" className="rounded border px-1 hover:bg-muted/60" onClick={() => setPendingFiles((prev) => prev.filter((x) => !(x.name === file.name && x.lastModified === file.lastModified)))}><X className="h-3 w-3" /></button>
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
                accept="image/*,.txt,.md,.markdown,.pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  if (!files.length) return
                  const accepted = files.filter((f) => f.size <= MAX_ATTACHMENT_SIZE)
                  const rejected = files.length - accepted.length
                  if (rejected > 0) message.error(rejected === 1 ? "文件不能超过 5MB" : `${rejected} 个文件超过 5MB，已忽略`, 3000)
                  if (accepted.length) setPendingFiles((prev) => [...prev, ...accepted])
                  e.currentTarget.value = ""
                }}
              />
              {!composerExpanded ? (
                <div className="flex items-center gap-2">
                  <button type="button" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-muted/60" onClick={() => attachmentInputRef.current?.click()} title="添加附件"><Plus className="h-4 w-4" /></button>
                  <div className="min-w-0 flex-1">
                    <textarea
                      ref={inputRef}
                      className="block min-h-[36px] w-full resize-none bg-transparent px-0 py-0 text-sm leading-9 outline-none"
                      placeholder="有问题，尽管问"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onInput={(e) => adjustComposerHeight(e.currentTarget)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          if (!sending) void send()
                        }
                      }}
                      rows={1}
                    />
                  </div>
                  <button className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-50" onClick={() => void send()} disabled={blockedByUnpublished || sending || (!input.trim() && !pendingFiles.length)} title="发送"><ArrowUp className="h-4 w-4" /></button>
                </div>
              ) : (
                <>
                  <div className="min-w-0">
                    <textarea
                      ref={inputRef}
                      className="block min-h-[36px] w-full resize-none bg-transparent px-0 py-1 text-sm leading-6 outline-none"
                      placeholder="输入消息，Enter 发送，Shift+Enter 换行"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onInput={(e) => adjustComposerHeight(e.currentTarget)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          if (!sending) void send()
                        }
                      }}
                      rows={1}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <button type="button" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-muted/60" onClick={() => attachmentInputRef.current?.click()} title="添加附件"><Plus className="h-4 w-4" /></button>
                    <button className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-50" onClick={() => void send()} disabled={blockedByUnpublished || sending || (!input.trim() && !pendingFiles.length)} title="发送"><ArrowUp className="h-4 w-4" /></button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <ConfirmDeleteDialog
          open={!!confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={onDeleteConversation}
          title="确认删除对话"
          description={confirmDelete ? `将删除对话「${normalizeConversationTitle(confirmDelete.title)}」，该操作不可恢复` : undefined}
          errorText={deleteConversation.isError ? "删除失败，请重试" : null}
          confirming={deleteConversation.isPending}
        />
        <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)} title={previewImage?.name ?? "图片预览"}>
          {previewImage ? <div className="max-h-[75svh] overflow-auto"><img src={previewImage.url} alt={previewImage.name ?? "图片预览"} className="mx-auto h-auto max-w-full rounded-md border" /></div> : null}
        </Dialog>
        {activeCitation ? (
          <div className="fixed inset-0 z-40" onClick={() => setActiveCitation(null)}>
            <div
              className="absolute w-[min(520px,calc(100vw-24px))] overflow-hidden rounded-lg border bg-popover text-sm text-popover-foreground shadow-xl"
              style={{ left: activeCitation.left, top: activeCitation.top }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b bg-muted/30 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-muted-foreground">参考片段 [{activeCitation.index + 1}]</div>
                  <div className="mt-0.5 truncate text-sm font-medium" title={activeCitation.citation.fileName}>
                    {activeCitation.citation.fileName}
                  </div>
                </div>
              </div>
              <div className="max-h-[420px] overflow-auto bg-background/70 px-4 py-3">
                <MarkdownMessage content={activeCitation.citation.snippet} />
              </div>
              <div className="border-t bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
                相关度 {activeCitation.citation.score.toFixed(3)}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
