import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { MessageCirclePlus, Trash2 } from "lucide-react"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { streamAssistantReply, type AssistantMessage, type AssistantConversation } from "@/api/assistantChat"
import { useAssistant } from "@/features/assistants/queries"
import {
  useAssistantConversations,
  useAssistantMessages,
  useCreateAssistantConversation,
  useDeleteAssistantConversation,
} from "@/features/assistantChat/queries"
import { useQueryClient } from "@tanstack/react-query"

function formatTime(iso: string) {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

export function AssistantChatPage() {
  const params = useParams()
  const assistantId = params.id ?? ""
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedConversationId = searchParams.get("c") ?? ""

  const qc = useQueryClient()
  const assistant = useAssistant(assistantId, !!assistantId)
  const conversations = useAssistantConversations(assistantId)
  const createConversation = useCreateAssistantConversation(assistantId)
  const deleteConversation = useDeleteAssistantConversation(assistantId)

  const messagesQuery = useAssistantMessages(assistantId, selectedConversationId, !!selectedConversationId)
  const baseMessages = messagesQuery.data ?? []

  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [pendingUser, setPendingUser] = useState<AssistantMessage | null>(null)
  const [pendingAssistant, setPendingAssistant] = useState<AssistantMessage | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<AssistantConversation | null>(null)

  const typewriterQueueRef = useRef("")
  const typewriterTextRef = useRef("")
  const typewriterTimerRef = useRef<number | null>(null)

  const list = conversations.data ?? []
  const selectedConversation = useMemo(
    () => list.find((x) => x.id === selectedConversationId) ?? null,
    [list, selectedConversationId],
  )

  const combinedMessages = useMemo(() => {
    const out = [...baseMessages]
    if (pendingUser) out.push(pendingUser)
    if (pendingAssistant) out.push(pendingAssistant)
    return out
  }, [baseMessages, pendingUser, pendingAssistant])

  const bottomRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [combinedMessages.length, pendingAssistant?.content])

  useEffect(() => {
    return () => {
      if (typewriterTimerRef.current !== null) {
        window.clearInterval(typewriterTimerRef.current)
        typewriterTimerRef.current = null
      }
    }
  }, [])

  function stopTypewriter() {
    typewriterQueueRef.current = ""
    if (typewriterTimerRef.current !== null) {
      window.clearInterval(typewriterTimerRef.current)
      typewriterTimerRef.current = null
    }
  }

  function startTypewriter() {
    if (typewriterTimerRef.current !== null) return
    typewriterTimerRef.current = window.setInterval(() => {
      const q = typewriterQueueRef.current
      if (!q) return

      const backlog = q.length
      const maxChars =
        backlog > 2000 ? 120 : backlog > 1000 ? 80 : backlog > 400 ? 40 : backlog > 150 ? 20 : 8
      const chunk = q.slice(0, maxChars)
      typewriterQueueRef.current = q.slice(maxChars)

      typewriterTextRef.current += chunk
      const nextText = typewriterTextRef.current
      setPendingAssistant((prev) => (prev ? { ...prev, content: nextText } : prev))
    }, 16)
  }

  useEffect(() => {
    if (!assistantId) return
    if (conversations.isLoading || createConversation.isPending) return
    if (selectedConversationId) return
    if (!list.length) return
    setSearchParams({ c: list[0].id }, { replace: true })
  }, [assistantId, conversations.isLoading, createConversation.isPending, selectedConversationId, list, setSearchParams])

  async function startNewConversation() {
    const created = await createConversation.mutateAsync()
    setSearchParams({ c: created.id }, { replace: false })
  }

  async function onDeleteConversation() {
    if (!confirmDelete) return
    const idToDelete = confirmDelete.id
    await deleteConversation.mutateAsync({ conversationId: idToDelete })
    setConfirmDelete(null)
    if (selectedConversationId === idToDelete) {
      setSearchParams({}, { replace: true })
    }
  }

  async function send() {
    const text = input.trim()
    if (!text) return
    if (!assistantId) return

    setStreamError(null)
    setSending(true)
    stopTypewriter()

    let conversationId = selectedConversationId
    if (!conversationId) {
      const created = await createConversation.mutateAsync()
      conversationId = created.id
      setSearchParams({ c: created.id }, { replace: true })
    }

    const tempUser: AssistantMessage = {
      id: `temp-user-${Date.now()}`,
      conversationId,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    }
    const tempAssistant: AssistantMessage = {
      id: `temp-assistant-${Date.now()}`,
      conversationId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    }

    setPendingUser(tempUser)
    setPendingAssistant(tempAssistant)
    typewriterTextRef.current = ""
    setInput("")

    try {
      const controller = new AbortController()
      const stream = await streamAssistantReply({
        assistantId,
        conversationId,
        message: text,
        signal: controller.signal,
      })

      let assistantText = ""
      for await (const ev of stream) {
        if (ev.type === "delta") {
          assistantText += ev.delta
          typewriterQueueRef.current += ev.delta
          startTypewriter()
        } else if (ev.type === "error") {
          stopTypewriter()
          setStreamError(ev.message || "请求失败")
        } else if (ev.type === "done") {
          stopTypewriter()
          assistantText = ev.message.content
          typewriterTextRef.current = assistantText
          setPendingAssistant(null)
          setPendingUser(null)
          await qc.invalidateQueries({ queryKey: ["assistantChat", assistantId, "conversations"] })
          await qc.invalidateQueries({
            queryKey: ["assistantChat", assistantId, "conversations", conversationId, "messages"],
          })
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
    <div className="flex h-[calc(100svh-3rem)] min-h-[600px] gap-4">
      <aside className="flex w-72 shrink-0 flex-col rounded-lg border bg-background">
        <div className="flex items-center justify-between gap-2 border-b p-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium" title={assistant.data?.name ?? ""}>
              {assistant.isLoading ? "加载中…" : assistant.data?.name ?? "问答助手"}
            </div>
            <div className="truncate text-xs text-muted-foreground">历史记录</div>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm hover:bg-muted/60"
            onClick={startNewConversation}
            disabled={createConversation.isPending}
            title="新对话"
          >
            <MessageCirclePlus className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-2">
          {conversations.isLoading ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">加载中…</div>
          ) : conversations.isError ? (
            <div className="px-2 py-6 text-center text-sm text-destructive">加载失败，请检查后端服务</div>
          ) : list.length ? (
            <div className="space-y-1">
              {list.map((c) => {
                const active = c.id === selectedConversationId
                return (
                  <div
                    key={c.id}
                    className={[
                      "group flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm",
                      active ? "bg-muted font-medium" : "hover:bg-muted/60",
                    ].join(" ")}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSearchParams({ c: c.id }, { replace: false })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSearchParams({ c: c.id }, { replace: false })
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{c.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{formatTime(c.updatedAt)}</div>
                    </div>
                    <button
                      className="hidden rounded-md border px-2 py-1 text-xs text-destructive hover:bg-destructive/10 group-hover:inline-flex"
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDelete(c)
                      }}
                      title="删除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">暂无对话，点击右上角开始</div>
          )}
        </div>

        <div className="border-t p-3">
          <button className="w-full rounded-md border px-3 py-2 text-sm hover:bg-muted/60" onClick={() => navigate("/assistants")}>
            返回问答助手
          </button>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col rounded-lg border bg-background">
        <div className="border-b p-3">
          <div className="text-sm font-medium">{selectedConversation?.title ?? "对话"}</div>
          {streamError ? <div className="mt-1 text-xs text-destructive">{streamError}</div> : null}
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
          {messagesQuery.isLoading && selectedConversationId ? (
            <div className="text-center text-sm text-muted-foreground">加载中…</div>
          ) : messagesQuery.isError ? (
            <div className="text-center text-sm text-destructive">加载失败，请检查后端服务</div>
          ) : combinedMessages.length ? (
            combinedMessages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={[
                    "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed",
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                  ].join(" ")}
                >
                  {m.content || (m.role === "assistant" && sending ? "…" : "")}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-sm text-muted-foreground">开始提问吧</div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <textarea
              className="min-h-10 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
              placeholder="输入消息，Enter 发送，Shift+Enter 换行"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  if (!sending) void send()
                }
              }}
              disabled={sending}
              rows={2}
            />
            <button
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              onClick={() => void send()}
              disabled={sending || !input.trim()}
            >
              {sending ? "发送中…" : "发送"}
            </button>
          </div>
        </div>
      </section>

      <ConfirmDeleteDialog
        open={!!confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={onDeleteConversation}
        title="确认删除对话"
        description={confirmDelete ? `将删除对话「${confirmDelete.title}」，该操作不可恢复。` : undefined}
        errorText={deleteConversation.isError ? "删除失败，请重试" : null}
        confirming={deleteConversation.isPending}
      />
    </div>
  )
}
