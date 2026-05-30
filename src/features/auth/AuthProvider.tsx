import { useMemo, useState } from "react"
import { AuthContext } from "@/features/auth/authContext"
import { clearAccessToken, getAccessToken, setAccessToken } from "@/features/auth/authStorage"
import { redirectToLogin } from "@/features/auth/redirectToLogin"

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
        redirectToLogin("/")
      },
    }),
    [token]
  )

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
}
