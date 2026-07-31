export type SortDir = "asc" | "desc"

export type ListQuery = {
  page?: number
  pageSize?: number
  q?: string
}

export type PaginatedResult<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100

export type NormalizedListQuery = {
  page: number
  pageSize: number
  q: string
}

export function normalizeListQuery(params: ListQuery = {}): NormalizedListQuery {
  const page = Number.isFinite(params.page) ? Math.max(1, Math.floor(params.page as number)) : DEFAULT_PAGE
  const rawSize = Number.isFinite(params.pageSize)
    ? Math.floor(params.pageSize as number)
    : DEFAULT_PAGE_SIZE
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, rawSize))
  const q = typeof params.q === "string" ? params.q.trim() : ""
  return { page, pageSize, q }
}

export function listQueryToSearchParams(params: ListQuery = {}) {
  const normalized = normalizeListQuery(params)
  return {
    page: normalized.page,
    pageSize: normalized.pageSize,
    ...(normalized.q ? { q: normalized.q } : {}),
  }
}
