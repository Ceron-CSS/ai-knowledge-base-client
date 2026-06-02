import { useMemo, useState } from "react"
import { AuthContext } from "@/features/auth/authContext"
import { clearAccessToken, getAccessToken, setAccessToken } from "@/features/auth/authStorage"
import { redirectToLogin } from "@/features/auth/redirectToLogin"

function readTokenPayload(token: string | null): {
  username: string | null
  displayName: string | null
  provider: "local" | "github" | null
} {
  if (!token) return { username: null, provider: null }
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as {
      username?: unknown
      displayName?: unknown
      provider?: unknown
    }
    return {
      username: typeof payload.username === "string" ? payload.username : null,
      displayName: typeof payload.displayName === "string" ? payload.displayName : null,
      provider: payload.provider === "github" ? "github" : "local",
    }
  } catch {
    return { username: null, displayName: null, provider: "local" }
  }
}

export function AuthProvider(props: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAccessToken())
  const { username, displayName, provider } = readTokenPayload(token)

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
    [displayName, provider, token, username]
  )

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
}
