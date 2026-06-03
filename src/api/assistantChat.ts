import { getApiBaseUrl } from "@/app/env"
import { getAccessToken } from "@/features/auth/authStorage"
import { requestJson } from "@/api/http"

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

function joinUrl(base: string, path: string) {
  const baseTrimmed = base.replace(/\/+$/, "")
  const pathTrimmed = path.replace(/^\/+/, "")
  return `${baseTrimmed}/${pathTrimmed}`
}

async function* readSseStream(response: Response): AsyncGenerator<StreamEvent> {
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(text || `Request failed (${response.status})`)
  }
  if (!response.body) throw new Error("Missing response body")

  const reader = response.body.getReader()
  const decoder = new TextDecoder("utf-8")
  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    while (true) {
      const idx = buffer.indexOf("\n\n")
      if (idx === -1) break
      const rawEvent = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)

      const lines = rawEvent.split("\n")
      for (const line of lines) {
        const trimmed = line.trimEnd()
        if (!trimmed.startsWith("data:")) continue
        const data = trimmed.slice("data:".length).trim()
        if (!data) continue
        let parsed: unknown
        try {
          parsed = JSON.parse(data)
        } catch {
          continue
        }
        if (parsed && typeof parsed === "object" && "type" in parsed) {
          yield parsed as StreamEvent
        }
      }
    }
  }
}

export async function streamAssistantReply(args: {
  assistantId: string
  conversationId: string
  text: string
  attachments?: AssistantAttachment[]
  signal?: AbortSignal
}): Promise<AsyncGenerator<StreamEvent>> {
  const baseUrl = getApiBaseUrl()
  const token = getAccessToken()

  const url = joinUrl(baseUrl, `/assistants/${args.assistantId}/conversations/${args.conversationId}/messages/stream`)
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text: args.text, attachments: args.attachments ?? [] }),
    signal: args.signal,
  })

  return readSseStream(response)
}

export async function uploadAssistantImageAttachment(args: {
  assistantId: string
  conversationId: string
  file: File
}): Promise<AssistantImageAttachment> {
  const baseUrl = getApiBaseUrl()
  const token = getAccessToken()
  const url = joinUrl(baseUrl, `/assistants/${args.assistantId}/conversations/${args.conversationId}/attachments/image`)
  const formData = new FormData()
  formData.set("file", args.file)
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(text || `Request failed (${response.status})`)
  }
  return (await response.json()) as AssistantImageAttachment
}

export async function uploadAssistantFileForExtraction(args: {
  assistantId: string
  conversationId: string
  file: File
}): Promise<AssistantFileAttachment> {
  const baseUrl = getApiBaseUrl()
  const token = getAccessToken()
  const url = joinUrl(baseUrl, `/assistants/${args.assistantId}/conversations/${args.conversationId}/attachments/extract-file`)
  const formData = new FormData()
  formData.set("file", args.file)
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(text || `Request failed (${response.status})`)
  }
  return (await response.json()) as AssistantFileAttachment
}
