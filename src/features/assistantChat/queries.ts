import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createAssistantConversation,
  deleteAssistantConversation,
  listAssistantConversations,
  listAssistantMessages,
} from "@/api/assistantChat"

const assistantChatKeys = {
  conversations: (assistantId: string) => ["assistantChat", assistantId, "conversations"] as const,
  messages: (assistantId: string, conversationId: string) =>
    ["assistantChat", assistantId, "conversations", conversationId, "messages"] as const,
}

export function useAssistantConversations(assistantId: string) {
  return useQuery({
    queryKey: assistantChatKeys.conversations(assistantId),
    queryFn: () => listAssistantConversations(assistantId),
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
      await qc.invalidateQueries({ queryKey: assistantChatKeys.conversations(assistantId) })
    },
  })
}

export function useDeleteAssistantConversation(assistantId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId }: { conversationId: string }) =>
      deleteAssistantConversation(assistantId, conversationId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: assistantChatKeys.conversations(assistantId) })
    },
  })
}

export function invalidateAssistantMessages(qc: ReturnType<typeof useQueryClient>, assistantId: string, conversationId: string) {
  return qc.invalidateQueries({ queryKey: assistantChatKeys.messages(assistantId, conversationId) })
}

