import { getApiBaseUrl } from "@/app/env"
import { getAccessToken } from "@/features/auth/authStorage"

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export type ApiErrorBody = {
  message?: string
  code?: string
  details?: unknown
}

export class HttpError extends Error {
  readonly status: number
  readonly code?: string
  readonly details?: unknown

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message)
    this.name = "HttpError"
    this.status = status
    this.code = code
    this.details = details
  }
}

function joinUrl(base: string, path: string) {
  const baseTrimmed = base.replace(/\/+$/, "")
  const pathTrimmed = path.replace(/^\/+/, "")
  return `${baseTrimmed}/${pathTrimmed}`
}

async function parseErrorBody(response: Response): Promise<ApiErrorBody | undefined> {
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) return undefined
  try {
    return (await response.json()) as ApiErrorBody
  } catch {
    return undefined
  }
}

export type RequestOptions = {
  method?: HttpMethod
  headers?: Record<string, string>
  query?: Record<string, string | number | boolean | undefined | null>
  body?: unknown
  signal?: AbortSignal
}

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl()
  const url = new URL(joinUrl(baseUrl, path))
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === undefined || value === null) continue
      url.searchParams.set(key, String(value))
    }
  }

  const token = getAccessToken()
  const headers: Record<string, string> = {
    ...(options.body ? { "content-type": "application/json" } : {}),
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  })

  if (!response.ok) {
    const body = await parseErrorBody(response)
    const message = body?.message ?? `Request failed (${response.status})`
    throw new HttpError(response.status, message, body?.code, body?.details)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
