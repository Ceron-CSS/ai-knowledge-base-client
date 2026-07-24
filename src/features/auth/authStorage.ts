const ACCESS_TOKEN_KEY = "akb_access_token"
export const AUTH_STORAGE_EVENT = "akb_auth_storage_changed"

type AccessTokenPayload = {
  username?: unknown
  displayName?: unknown
  provider?: unknown
  exp?: unknown
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
  return atob(padded)
}

export function readAccessTokenPayload(token: string | null): AccessTokenPayload | null {
  if (!token) return null
  try {
    const payloadPart = token.split(".")[1]
    if (!payloadPart) return null
    const payload = JSON.parse(decodeBase64Url(payloadPart)) as unknown
    return payload && typeof payload === "object" ? (payload as AccessTokenPayload) : null
  } catch {
    return null
  }
}

export function isAccessTokenValid(token: string | null, nowMs = Date.now()): boolean {
  const payload = readAccessTokenPayload(token)
  if (!payload || typeof payload.exp !== "number") return false
  return payload.exp * 1000 > nowMs
}

function emitAuthStorageEvent() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(AUTH_STORAGE_EVENT))
}

export function getAccessToken(): string | null {
  try {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) return null
    if (!isAccessTokenValid(token)) {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      return null
    }
    return token
  } catch {
    return null
  }
}

export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
  emitAuthStorageEvent()
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  emitAuthStorageEvent()
}
