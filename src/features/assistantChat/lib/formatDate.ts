import { formatShanghaiDateTime } from "@/lib/dateTime"

export function formatChatTime(iso: string) {
  return formatShanghaiDateTime(iso)
}
