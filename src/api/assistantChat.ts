import { authenticatedFetch, requestJson, throwIfNotOk } from "@/api/http"
import { readSseJsonStream } from "@/api/http-stream"
import {
  listQueryToSearchParams,
  type ListQuery,
  type PaginatedResult,
  type SortDir,
} from "@/api/listQuery"

export type AssistantConversation = {
  id: string
  assistantId: string
  title: string
  createdAt: string
  updatedAt: string
}

export type AssistantConversationSortBy = "updatedAt" | "createdAt" | "title"
export type { SortDir, PaginatedResult, ListQuery }

export type AssistantConversationListParams = ListQuery & {
  sortBy?: AssistantConversationSortBy
  sortDir?: SortDir
}

export type AssistantMessage = {
  id: string
  conversationId: string
  role: "user" | "assistant"
  content: string
  runId?: string | null
  createdAt: string
}

export type AssistantCitation = {
  kbId: string
  itemId: string
  fileName: string
  snippet: string
  score: number
  chunkIndex?: number
  pageStart?: number
  pageEnd?: number
}

export function listAssistantConversations(assistantId: string, params: AssistantConversationListParams = {}) {
  const listParams = listQueryToSearchParams(params)
  return requestJson<PaginatedResult<AssistantConversation>>(`/assistants/${assistantId}/conversations`, {
    query: {
      ...listParams,
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
  | { type: "run_started"; runId: string; requestedExecutionMode?: string }
  | { type: "tool_started"; runId: string; toolStep: number; toolCall: { id: string; name: string } }
  | {
      type: "tool_finished"
      runId: string
      toolStep: number
      toolCall: { id: string; name: string; durationMs?: number }
      summary?: Record<string, unknown>
    }
  | { type: "tool_rejected"; runId: string; toolCall: { id: string; name: string }; code?: string }
  | { type: "generation_started"; runId: string }
  | { type: "delta"; delta: string; runId?: string }
  | {
      type: "done"
      message: AssistantMessage
      citations?: AssistantCitation[]
      runId?: string
      effectiveExecutionMode?: string
    }
  | { type: "error"; message: string; saved?: AssistantMessage; runId?: string }

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
    typeof citation.score === "number" &&
    (citation.chunkIndex === undefined || typeof citation.chunkIndex === "number") &&
    (citation.pageStart === undefined || typeof citation.pageStart === "number") &&
    (citation.pageEnd === undefined || typeof citation.pageEnd === "number")
  )
}

function parseStreamEvent(parsed: unknown): StreamEvent | null {
  if (!parsed || typeof parsed !== "object") return null
  const event = parsed as Record<string, unknown>
  if (event.type === "run_started" && typeof event.runId === "string") {
    return {
      type: "run_started",
      runId: event.runId,
      ...(typeof event.requestedExecutionMode === "string"
        ? { requestedExecutionMode: event.requestedExecutionMode }
        : {}),
    }
  }
  if (
    event.type === "tool_started" &&
    typeof event.runId === "string" &&
    typeof event.toolStep === "number" &&
    event.toolCall &&
    typeof event.toolCall === "object"
  ) {
    const toolCall = event.toolCall as Record<string, unknown>
    if (typeof toolCall.id === "string" && typeof toolCall.name === "string") {
      return {
        type: "tool_started",
        runId: event.runId,
        toolStep: event.toolStep,
        toolCall: { id: toolCall.id, name: toolCall.name },
      }
    }
  }
  if (
    event.type === "tool_finished" &&
    typeof event.runId === "string" &&
    typeof event.toolStep === "number" &&
    event.toolCall &&
    typeof event.toolCall === "object"
  ) {
    const toolCall = event.toolCall as Record<string, unknown>
    if (typeof toolCall.id === "string" && typeof toolCall.name === "string") {
      return {
        type: "tool_finished",
        runId: event.runId,
        toolStep: event.toolStep,
        toolCall: {
          id: toolCall.id,
          name: toolCall.name,
          ...(typeof toolCall.durationMs === "number" ? { durationMs: toolCall.durationMs } : {}),
        },
        ...(event.summary && typeof event.summary === "object"
          ? { summary: event.summary as Record<string, unknown> }
          : {}),
      }
    }
  }
  if (
    event.type === "tool_rejected" &&
    typeof event.runId === "string" &&
    event.toolCall &&
    typeof event.toolCall === "object"
  ) {
    const toolCall = event.toolCall as Record<string, unknown>
    if (typeof toolCall.id === "string" && typeof toolCall.name === "string") {
      return {
        type: "tool_rejected",
        runId: event.runId,
        toolCall: { id: toolCall.id, name: toolCall.name },
        ...(typeof event.code === "string" ? { code: event.code } : {}),
      }
    }
  }
  if (event.type === "generation_started" && typeof event.runId === "string") {
    return { type: "generation_started", runId: event.runId }
  }
  if (event.type === "delta" && typeof event.delta === "string") {
    return {
      type: "delta",
      delta: event.delta,
      ...(typeof event.runId === "string" ? { runId: event.runId } : {}),
    }
  }
  if (event.type === "done" && isAssistantMessage(event.message)) {
    const citations = Array.isArray(event.citations)
      ? event.citations.filter((item): item is AssistantCitation => isAssistantCitation(item))
      : undefined
    return {
      type: "done",
      message: event.message,
      ...(citations?.length ? { citations } : {}),
      ...(typeof event.runId === "string" ? { runId: event.runId } : {}),
      ...(typeof event.effectiveExecutionMode === "string"
        ? { effectiveExecutionMode: event.effectiveExecutionMode }
        : {}),
    }
  }
  if (event.type === "error" && typeof event.message === "string") {
    return {
      type: "error",
      message: event.message,
      ...(isAssistantMessage(event.saved) ? { saved: event.saved } : {}),
      ...(typeof event.runId === "string" ? { runId: event.runId } : {}),
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

export type CitationFeedbackPayload = {
  citationIndex: number
  kbId: string
  itemId: string
  chunkIndex?: number
  fileName: string
  snippet: string
  feedback?: "irrelevant"
}

export type CitationFeedback = {
  id: string
  assistantId: string
  conversationId: string
  messageId: string
  citationIndex: number
  kbId: string
  itemId: string
  chunkIndex: number | null
  fileName: string
  snippet: string
  feedback: string
  createdAt: string
}

export function submitCitationFeedback(args: {
  assistantId: string
  conversationId: string
  messageId: string
  body: CitationFeedbackPayload
}) {
  return requestJson<CitationFeedback>(
    `/assistants/${args.assistantId}/conversations/${args.conversationId}/messages/${args.messageId}/citation-feedback`,
    {
      method: "POST",
      body: {
        citationIndex: args.body.citationIndex,
        kbId: args.body.kbId,
        itemId: args.body.itemId,
        chunkIndex: args.body.chunkIndex,
        fileName: args.body.fileName,
        snippet: args.body.snippet,
        feedback: args.body.feedback ?? "irrelevant",
      },
    },
  )
}
