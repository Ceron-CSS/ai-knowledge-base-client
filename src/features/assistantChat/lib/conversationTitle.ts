export function normalizeConversationTitle(title: string): string {
  const value = title.trim()
  if (!value) return "新对话"
  if (/\uFFFD/.test(value)) return "新对话"
  return value
}
