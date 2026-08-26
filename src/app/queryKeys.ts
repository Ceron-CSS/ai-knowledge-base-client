export const queryKeys = {
  auth: {
    root: ["auth"] as const,
    passwordPolicy: () => ["auth", "password-policy"] as const,
  },
  dashboard: {
    stats: () => ["dashboard-stats"] as const,
  },
  assistants: {
    root: ["assistants"] as const,
    detail: (id: string) => ["assistants", id] as const,
  },
  assistantChat: {
    root: ["assistantChat"] as const,
    conversations: (assistantId: string) =>
      ["assistantChat", assistantId, "conversations"] as const,
    messages: (assistantId: string, conversationId: string) =>
      ["assistantChat", assistantId, "conversations", conversationId, "messages"] as const,
  },
  knowledgeBases: {
    root: ["kb"] as const,
    detail: (kbId: string) => ["kb", "detail", kbId] as const,
    items: (kbId: string) => ["kb", "items", kbId] as const,
    allItems: () => ["kb", "items", "all"] as const,
  },
  modelConfigs: {
    root: ["model-configs"] as const,
    context: (context: string) => ["model-configs", context] as const,
  },
  agentRuns: {
    root: ["agent-runs"] as const,
    detail: (runId: string) => ["agent-run", runId] as const,
    list: (page: number, filters: unknown) => ["agent-runs", page, filters] as const,
    metrics: (assistantId: string | undefined) => ["agent-runs-metrics", assistantId] as const,
  },
  search: {
    root: ["search"] as const,
    chunks: (key: unknown) => ["search", "chunks", key] as const,
  },
} as const
