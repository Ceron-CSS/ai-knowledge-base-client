import { useEffect, useMemo, useState } from "react"
import { AuthContext } from "./authContext"
import { redirectToLogin } from "../lib/redirect"
import {
  AUTH_STORAGE_EVENT,
  clearAccessToken,
  getAccessToken,
  readAccessTokenPayload,
  setAccessToken,
} from "../lib/storage"

function readTokenPayload(token: string | null): {
  username: string | null
  displayName: string | null
  provider: "local" | "github" | null
} {
  if (!token) return { username: null, displayName: null, provider: null }
  const payload = readAccessTokenPayload(token)
  if (!payload) {
    return { username: null, displayName: null, provider: "local" }
  }
  return {
    username: typeof payload.username === "string" ? payload.username : null,
    displayName: typeof payload.displayName === "string" ? payload.displayName : null,
    provider: payload.provider === "github" ? "github" : "local",
  }
}

export function AuthProvider(props: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAccessToken())
  const { username, displayName, provider } = readTokenPayload(token)

  useEffect(() => {
    const syncToken = () => setToken(getAccessToken())

    window.addEventListener(AUTH_STORAGE_EVENT, syncToken)
    window.addEventListener("storage", syncToken)

    return () => {
      window.removeEventListener(AUTH_STORAGE_EVENT, syncToken)
      window.removeEventListener("storage", syncToken)
    }
  }, [])

  const value = useMemo(
    () => ({
      isAuthed: Boolean(token),
      token,
      username,
      displayName,
      provider,
      loginWithToken: (newToken: string) => {
        setAccessToken(newToken)
        setToken(newToken)
      },
      logout: () => {
        clearAccessToken()
        setToken(null)
        redirectToLogin("/")
      },
    }),
    [displayName, provider, token, username],
  )

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
}
