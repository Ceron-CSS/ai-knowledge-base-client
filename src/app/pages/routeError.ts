import { isRouteErrorResponse } from "react-router-dom"

const CHUNK_LOAD_ERROR_PATTERN = /dynamically imported module|chunk.*failed|loading chunk/i

export type ResolvedRouteError = {
  title: string
  message: string
  isChunkError: boolean
}

export function resolveRouteError(error: unknown): ResolvedRouteError {
  if (isRouteErrorResponse(error)) {
    const dataMessage =
      typeof error.data === "string"
        ? error.data
        : typeof error.data === "object" && error.data && "message" in error.data
          ? String((error.data as { message?: unknown }).message ?? "")
          : ""

    return {
      title: error.status === 404 ? "页面不存在" : `请求失败（${error.status}）`,
      message: dataMessage || error.statusText || "页面加载失败，请稍后重试。",
      isChunkError: false,
    }
  }

  if (error instanceof Error) {
    const isChunkError = CHUNK_LOAD_ERROR_PATTERN.test(error.message)
    return {
      title: isChunkError ? "页面资源加载失败" : "页面出错了",
      message: isChunkError
        ? "新版本可能已发布，请刷新页面后重试。"
        : error.message || "发生未知错误，请稍后重试。",
      isChunkError,
    }
  }

  return {
    title: "页面出错了",
    message: "发生未知错误，请稍后重试。",
    isChunkError: false,
  }
}
