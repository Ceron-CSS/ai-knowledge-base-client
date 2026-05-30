import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createAssistantConversation,
  deleteAssistantConversation,
  listAssistantConversations,
  listAssistantMessages,
  renameAssistantConversation,
  type AssistantConversationSortBy,
  type SortDir,
} from "@/api/assistantChat"

const assistantChatKeys = {
  conversations: (assistantId: string, params: { sortBy?: AssistantConversationSortBy; sortDir?: SortDir }) =>
    ["assistantChat", assistantId, "conversations", params] as const,
  messages: (assistantId: string, conversationId: string) =>
    ["assistantChat", assistantId, "conversations", conversationId, "messages"] as const,
}

const EMPTY_CONVERSATION_PARAMS: { sortBy?: AssistantConversationSortBy; sortDir?: SortDir } = {}

export function useAssistantConversations(
  assistantId: string,
  params?: { sortBy?: AssistantConversationSortBy; sortDir?: SortDir },
) {
  const effectiveParams = params ?? EMPTY_CONVERSATION_PARAMS
  return useQuery({
    queryKey: assistantChatKeys.conversations(assistantId, effectiveParams),
    queryFn: () => listAssistantConversations(assistantId, effectiveParams),
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
        if (!Array.isArray(value)) continue
        qc.setQueryData(
          key,
          value.filter(
            (item: unknown) =>
              !item ||
              typeof item !== "object" ||
              !("id" in item) ||
              (item as { id?: string }).id !== conversationId,
          ),
        )
      }
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx?.snapshots) return
      for (const [key, value] of ctx.snapshots) {
        qc.setQueryData(key, value)
      }
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

export function invalidateAssistantMessages(qc: ReturnType<typeof useQueryClient>, assistantId: string, conversationId: string) {
  return qc.invalidateQueries({ queryKey: assistantChatKeys.messages(assistantId, conversationId) })
}
