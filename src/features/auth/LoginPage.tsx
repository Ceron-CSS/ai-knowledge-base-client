import { useMemo, useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { login } from "@/api/auth"
import { getBooleanEnv, getEnv } from "@/app/env"
import { useAuth } from "@/features/auth/authContext"

export function LoginPage() {
  const auth = useAuth()
  const location = useLocation()
  const from = useMemo(() => {
    const s = location.state as { from?: string } | null
    return s?.from ?? "/"
  }, [location.state])

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const apiBaseUrl = getEnv("VITE_API_BASE_URL")
  const fakeAuthEnabled = getBooleanEnv("VITE_FAKE_AUTH", !apiBaseUrl)

  const loginMutation = useMutation({
    mutationFn: async () => {
      if (fakeAuthEnabled) {
        return { accessToken: `dev-token:${username.trim() || "user"}` }
      }
      return login({ username: username.trim(), password })
    },
    onSuccess: (data) => auth.loginWithToken(data.accessToken),
  })

  if (auth.isAuthed) return <Navigate to={from} replace />

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border bg-background p-5">
        <h1 className="text-base font-medium text-center">登录</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {fakeAuthEnabled
            ? "Dev mode: any username/password will work."
            : "Use your username and password to continue."}
        </p>

        <label className="mt-4 block text-sm font-medium">用户名</label>
        <input
          className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="yourname"
          autoComplete="username"
        />

        <label className="mt-4 block text-sm font-medium">密码</label>
        <input
          className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          type="password"
          autoComplete="current-password"
          onKeyDown={(e) => {
            if (e.key === "Enter") loginMutation.mutate()
          }}
        />

        {loginMutation.isError ? (
          <div className="mt-3 text-sm text-destructive">Login failed. Please check your credentials.</div>
        ) : null}

        <button
          className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          disabled={!username.trim() || !password || loginMutation.isPending}
          onClick={() => loginMutation.mutate()}
        >
          {loginMutation.isPending ? "Signing in..." : "继续"}
        </button>
      </div>
    </div>
  )
}
