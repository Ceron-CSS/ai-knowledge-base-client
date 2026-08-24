import { HttpError } from "@/api/http"
import { message } from "@/components/ui/message"

export const DEMO_ACCOUNT_DELETE_ERROR_CODE = "DEMO_ACCOUNT_DELETE_FORBIDDEN"
export const DEMO_ACCOUNT_DELETE_MESSAGE = "该账号为演示账号，不允许删除数据"

export function isDemoAccountDeleteError(error: unknown): boolean {
  return error instanceof HttpError && error.code === DEMO_ACCOUNT_DELETE_ERROR_CODE
}

export function getDeleteErrorMessage(error: unknown, fallback = "删除失败，请重试"): string {
  if (isDemoAccountDeleteError(error)) return DEMO_ACCOUNT_DELETE_MESSAGE
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

export function showDeleteFailureToast(error: unknown, fallback?: string) {
  message.error(getDeleteErrorMessage(error, fallback))
}
