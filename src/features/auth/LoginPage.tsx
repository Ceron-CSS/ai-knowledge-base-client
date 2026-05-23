import { useMemo, useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/features/auth/authContext"

export function LoginPage() {
  const auth = useAuth()
  const location = useLocation()
  const from = useMemo(() => {
    const s = location.state as { from?: string } | null
    return s?.from ?? "/"
  }, [location.state])

  const [token, setToken] = useState("")

  if (auth.isAuthed) return <Navigate to={from} replace />

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border bg-background p-5">
        <h1 className="text-base font-medium">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Paste access token to continue.</p>
        <label className="mt-4 block text-sm font-medium">Access token</label>
        <input
          className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="eyJhbGciOi..."
          autoComplete="off"
        />
        <button
          className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          disabled={!token.trim()}
          onClick={() => auth.loginWithToken(token.trim())}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
