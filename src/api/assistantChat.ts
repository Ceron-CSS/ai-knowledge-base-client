import { authenticatedFetch, requestJson, throwIfNotOk } from "@/api/http"
import { readSseJsonStream } from "@/api/http-stream"

export type AssistantConversation = {
  id: string
  assistantId: string
  title: string
  createdAt: string
  updatedAt: string
}

export type AssistantConversationSortBy = "updatedAt" | "createdAt" | "title"
export type SortDir = "asc" | "desc"

export type AssistantMessage = {
  id: string
  conversationId: string
  role: "user" | "assistant"
  content: string
  createdAt: string
}

export type AssistantCitation = {
  kbId: string
  itemId: string
  fileName: string
  snippet: string
  score: number
}

export function listAssistantConversations(
  assistantId: string,
  params: { sortBy?: AssistantConversationSortBy; sortDir?: SortDir } = {},
) {
  return requestJson<AssistantConversation[]>(`/assistants/${assistantId}/conversations`, {
    query: {
      ...params,
      sortBy: params.sortBy ?? "createdAt",
      sortDir: params.sortDir ?? "desc",
    },
  })
}

export function createAssistantConversation(assistantId: string) {
  return requestJson<AssistantConversation>(`/assistants/${assistantId}/conversations`, { method: "POST" })
}

export function deleteAssistantConversation(assistantId: string, conversationId: string) {
  return requestJson<void>(`/assistants/${assistantId}/conversations/${conversationId}`, { method: "DELETE" })
}

export function renameAssistantConversation(assistantId: string, conversationId: string, title: string) {
  return requestJson<AssistantConversation>(`/assistants/${assistantId}/conversations/${conversationId}`, {
    method: "PATCH",
    body: { title },
  })
}

export function listAssistantMessages(assistantId: string, conversationId: string) {
  return requestJson<AssistantMessage[]>(`/assistants/${assistantId}/conversations/${conversationId}/messages`)
}

export type StreamEvent =
  | { type: "delta"; delta: string }
  | { type: "done"; message: AssistantMessage; citations?: AssistantCitation[] }
  | { type: "error"; message: string; saved?: AssistantMessage }

export type AssistantImageAttachment = {
  kind: "image"
  fileName?: string
  mimeType?: string
  dataUrl: string
}

export type AssistantFileAttachment = {
  kind: "file"
  fileName: string
  fileType?: string
  extractedText: string
}

export type AssistantAttachment = AssistantImageAttachment | AssistantFileAttachment

function isAssistantMessage(value: unknown): value is AssistantMessage {
  if (!value || typeof value !== "object") return false
  const message = value as Record<string, unknown>
  return (
    typeof message.id === "string" &&
    typeof message.conversationId === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    typeof message.createdAt === "string"
  )
}

function isAssistantCitation(value: unknown): value is AssistantCitation {
  if (!value || typeof value !== "object") return false
  const citation = value as Record<string, unknown>
  return (
    typeof citation.kbId === "string" &&
    typeof citation.itemId === "string" &&
    typeof citation.fileName === "string" &&
    typeof citation.snippet === "string" &&
    typeof citation.score === "number"
  )
}

function parseStreamEvent(parsed: unknown): StreamEvent | null {
  if (!parsed || typeof parsed !== "object") return null
  const event = parsed as Record<string, unknown>
  if (event.type === "delta" && typeof event.delta === "string") {
    return { type: "delta", delta: event.delta }
  }
  if (event.type === "done" && isAssistantMessage(event.message)) {
    const citations = Array.isArray(event.citations)
      ? event.citations.filter((item): item is AssistantCitation => isAssistantCitation(item))
      : undefined
    return {
      type: "done",
      message: event.message,
      ...(citations?.length ? { citations } : {}),
    }
  }
  if (event.type === "error" && typeof event.message === "string") {
    return {
      type: "error",
      message: event.message,
      ...(isAssistantMessage(event.saved) ? { saved: event.saved } : {}),
    }
  }
  return null
}

export async function streamAssistantReply(args: {
  assistantId: string
  conversationId: string
  text: string
  attachments?: AssistantAttachment[]
  signal?: AbortSignal
}): Promise<AsyncGenerator<StreamEvent>> {
  const response = await authenticatedFetch(
    `/assistants/${args.assistantId}/conversations/${args.conversationId}/messages/stream`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: args.text, attachments: args.attachments ?? [] }),
      signal: args.signal,
    },
  )

  return readSseJsonStream(response, parseStreamEvent)
}

export async function uploadAssistantImageAttachment(args: {
  assistantId: string
  conversationId: string
  file: File
}): Promise<AssistantImageAttachment> {
  const formData = new FormData()
  formData.set("file", args.file)
  const response = await authenticatedFetch(
    `/assistants/${args.assistantId}/conversations/${args.conversationId}/attachments/image`,
    {
      method: "POST",
      body: formData,
    },
  )
  await throwIfNotOk(response)
  return (await response.json()) as AssistantImageAttachment
}

export async function uploadAssistantFileForExtraction(args: {
  assistantId: string
  conversationId: string
  file: File
}): Promise<AssistantFileAttachment> {
  const formData = new FormData()
  formData.set("file", args.file)
  const response = await authenticatedFetch(
    `/assistants/${args.assistantId}/conversations/${args.conversationId}/attachments/extract-file`,
    {
      method: "POST",
      body: formData,
    },
  )
  await throwIfNotOk(response)
  return (await response.json()) as AssistantFileAttachment
}
