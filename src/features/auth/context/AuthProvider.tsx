import { useCallback, useEffect, useMemo, useState } from "react"

import { getSession, logout as logoutRequest, type AuthSession } from "@/api/auth"
import { redirectToLogin } from "../lib/redirect"
import { clearLegacyAccessToken } from "../lib/storage"
import { AuthContext } from "./authContext"

export function AuthProvider(props: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshSession = useCallback(async () => {
    const nextSession = await getSession()
    setSession(nextSession)
    setIsLoading(false)
    return nextSession
  }, [])

  useEffect(() => {
    clearLegacyAccessToken()
    let cancelled = false

    void getSession()
      .then((nextSession) => {
        if (!cancelled) setSession(nextSession)
      })
      .catch(() => {
        if (!cancelled) setSession(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(
    () => ({
      isAuthed: Boolean(session),
      isLoading,
      username: session?.username ?? null,
      displayName: session?.displayName ?? null,
      provider: session?.provider ?? null,
      refreshSession,
      logout: () => {
        void logoutRequest().finally(() => {
          setSession(null)
          redirectToLogin("/home")
        })
      },
    }),
    [isLoading, refreshSession, session],
  )

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
}
