import { getApiBaseUrl } from "@/app/env"
import { redirectToLogin, resolvePostLoginPath } from "@/features/auth/lib/redirect"

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

export function joinApiPath(base: string, path: string) {
  const baseTrimmed = base.replace(/\/+$/, "")
  const pathTrimmed = path.replace(/^\/+/, "")
  return `${baseTrimmed}/${pathTrimmed}`
}

export function buildApiUrl(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
) {
  const url = new URL(joinApiPath(getApiBaseUrl(), path))
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function readErrorBody(response: Response): Promise<ApiErrorBody | undefined> {
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) return undefined
  try {
    return (await response.json()) as ApiErrorBody
  } catch {
    return undefined
  }
}

export async function parseApiError(response: Response) {
  const body = await readErrorBody(response)
  const message = body?.message ?? `Request failed (${response.status})`
  return { message, code: body?.code, details: body?.details }
}

export function handleUnauthorized() {
  redirectToLogin(resolvePostLoginPath(window.location.pathname))
}

function isLoginCredentialRequest(response: Response) {
  try {
    const { pathname } = new URL(response.url)
    return pathname === "/auth/login" || pathname.endsWith("/auth/login")
  } catch {
    return false
  }
}

export async function throwIfNotOk(response: Response) {
  if (!response.ok) {
    const error = await parseApiError(response)
    if (response.status === 401) {
      // 登录接口的 401 表示账号密码错误，不能当成会话过期
      if (!isLoginCredentialRequest(response)) {
        handleUnauthorized()
        throw new HttpError(401, "Session expired", error.code, error.details)
      }
    }
    throw new HttpError(response.status, error.message, error.code, error.details)
  }
}

export type AuthenticatedFetchOptions = {
  method?: HttpMethod
  headers?: Record<string, string>
  query?: Record<string, string | number | boolean | undefined | null>
  body?: BodyInit | null
  signal?: AbortSignal
}

export async function authenticatedFetch(path: string, options: AuthenticatedFetchOptions = {}) {
  const headers: Record<string, string> = {
    ...options.headers,
  }

  return fetch(buildApiUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    body: options.body ?? undefined,
    signal: options.signal,
    credentials: "include",
  })
}

export type RequestOptions = {
  method?: HttpMethod
  headers?: Record<string, string>
  query?: Record<string, string | number | boolean | undefined | null>
  body?: unknown
  signal?: AbortSignal
}

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await authenticatedFetch(path, {
    method: options.method,
    headers: {
      ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
    query: options.query,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  })

  await throwIfNotOk(response)

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
