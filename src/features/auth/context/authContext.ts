import { createContext, useContext } from "react"

type AuthContextValue = {
  isAuthed: boolean
  isLoading: boolean
  username: string | null
  displayName: string | null
  provider: "local" | "github" | null
  refreshSession: () => Promise<unknown>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
