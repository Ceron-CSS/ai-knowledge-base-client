import { useMutation, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query"
import type { InfiniteData } from "@tanstack/react-query"
import {
  createAssistantConversation,
  deleteAssistantConversation,
  listAssistantConversations,
  listAssistantMessages,
  renameAssistantConversation,
  type AssistantConversation,
  type AssistantConversationListParams,
  type PaginatedResult,
} from "@/api/assistantChat"
import { MAX_PAGE_SIZE } from "@/api/listQuery"
import { showDeleteFailureToast } from "@/lib/deleteError"

const CONVERSATION_PAGE_SIZE = 50

const assistantChatKeys = {
  conversations: (assistantId: string, params: AssistantConversationListParams) =>
    ["assistantChat", assistantId, "conversations", params] as const,
  conversationFeed: (
    assistantId: string,
    params: Omit<AssistantConversationListParams, "page" | "pageSize">,
  ) => ["assistantChat", assistantId, "conversations", "feed", params] as const,
  messages: (assistantId: string, conversationId: string) =>
    ["assistantChat", assistantId, "conversations", conversationId, "messages"] as const,
}

const EMPTY_CONVERSATION_PARAMS: AssistantConversationListParams = {}

function isConversationPage(value: unknown): value is PaginatedResult<AssistantConversation> {
  if (!value || typeof value !== "object") return false
  const page = value as PaginatedResult<AssistantConversation>
  return Array.isArray(page.items) && typeof page.total === "number"
}

function isConversationFeed(
  value: unknown,
): value is InfiniteData<PaginatedResult<AssistantConversation>> {
  if (!value || typeof value !== "object") return false
  const feed = value as InfiniteData<PaginatedResult<AssistantConversation>>
  return Array.isArray(feed.pages) && Array.isArray(feed.pageParams)
}

export function useAssistantConversations(assistantId: string, params?: AssistantConversationListParams) {
  const effectiveParams = params ?? EMPTY_CONVERSATION_PARAMS
  return useQuery({
    queryKey: assistantChatKeys.conversations(assistantId, effectiveParams),
    queryFn: () => listAssistantConversations(assistantId, effectiveParams),
    enabled: !!assistantId,
  })
}

export type AssistantConversationFeedParams = {
  q?: string
  sortBy?: AssistantConversationListParams["sortBy"]
  sortDir?: AssistantConversationListParams["sortDir"]
}

export function useAssistantConversationFeed(
  assistantId: string,
  params: AssistantConversationFeedParams = {},
) {
  return useInfiniteQuery({
    queryKey: assistantChatKeys.conversationFeed(assistantId, params),
    queryFn: ({ pageParam }) =>
      listAssistantConversations(assistantId, {
        ...params,
        page: pageParam,
        pageSize: Math.min(CONVERSATION_PAGE_SIZE, MAX_PAGE_SIZE),
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    enabled: !!assistantId,
  })
}

export function useAssistantMessages(assistantId: string, conversationId: string, enabled: boolean) {
  return useQuery({
    queryKey: assistantChatKeys.messages(assistantId, conversationId),
    queryFn: () => listAssistantMessages(assistantId, conversationId),
    enabled: enabled && !!assistantId && !!conversationId,
  })
}

export function useCreateAssistantConversation(assistantId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => createAssistantConversation(assistantId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["assistantChat", assistantId, "conversations"] })
    },
  })
}

export function useDeleteAssistantConversation(assistantId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId }: { conversationId: string }) =>
      deleteAssistantConversation(assistantId, conversationId),
    onMutate: async ({ conversationId }) => {
      await qc.cancelQueries({ queryKey: ["assistantChat", assistantId, "conversations"] })
      const snapshots = qc.getQueriesData({
        queryKey: ["assistantChat", assistantId, "conversations"],
      })
      for (const [key, value] of snapshots) {
        if (isConversationPage(value)) {
          qc.setQueryData(key, {
            ...value,
            items: value.items.filter((item) => item.id !== conversationId),
            total: Math.max(0, value.total - 1),
          })
          continue
        }
        if (!isConversationFeed(value)) continue
        qc.setQueryData(key, {
          ...value,
          pages: value.pages.map((page) => ({
            ...page,
            items: page.items.filter((item) => item.id !== conversationId),
            total: Math.max(0, page.total - 1),
          })),
        })
      }
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx?.snapshots) return
      for (const [key, value] of ctx.snapshots) {
        qc.setQueryData(key, value)
      }
      showDeleteFailureToast(_err)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["assistantChat", assistantId, "conversations"] })
    },
  })
}

export function useRenameAssistantConversation(assistantId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, title }: { conversationId: string; title: string }) =>
      renameAssistantConversation(assistantId, conversationId, title),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["assistantChat", assistantId, "conversations"] })
    },
  })
}

export function invalidateAssistantMessages(
  qc: ReturnType<typeof useQueryClient>,
  assistantId: string,
  conversationId: string,
) {
  return qc.invalidateQueries({ queryKey: assistantChatKeys.messages(assistantId, conversationId) })
}
