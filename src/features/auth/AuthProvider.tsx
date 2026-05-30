import { useMemo, useState } from "react"
import { AuthContext } from "@/features/auth/authContext"
import { clearAccessToken, getAccessToken, setAccessToken } from "@/features/auth/authStorage"

export function AuthProvider(props: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAccessToken())

  const value = useMemo(
    () => ({
      isAuthed: Boolean(token),
      token,
      loginWithToken: (newToken: string) => {
        setAccessToken(newToken)
        setToken(newToken)
      },
      logout: () => {
        clearAccessToken()
        setToken(null)
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.assign("/login")
        }
      },
    }),
    [token]
  )

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
}
