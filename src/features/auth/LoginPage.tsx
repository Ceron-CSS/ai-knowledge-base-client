import { useMemo, useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { login } from "@/api/auth"
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

  const loginMutation = useMutation({
    mutationFn: () => login({ username: username.trim(), password }),
    onSuccess: (data) => auth.loginWithToken(data.accessToken),
  })

  if (auth.isAuthed) return <Navigate to={from} replace />

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border bg-background p-5">
        <h1 className="text-base font-medium text-center">密码登录</h1>

        <label className="mt-4 block text-sm font-medium">用户名</label>
        <input
          className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="请输入用户名"
          autoComplete="username"
        />

        <label className="mt-4 block text-sm font-medium">密码</label>
        <input
          className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="请输入密码"
          type="password"
          autoComplete="current-password"
          onKeyDown={(e) => {
            if (e.key === "Enter") loginMutation.mutate()
          }}
        />

        {loginMutation.isError ? (
          <div className="mt-3 text-sm text-destructive">
            {loginMutation.error instanceof Error ? loginMutation.error.message : "登录失败，请检查用户名和密码。"}
          </div>
        ) : null}

        <button
          className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          disabled={!username.trim() || !password || loginMutation.isPending}
          onClick={() => loginMutation.mutate()}
        >
          {loginMutation.isPending ? "Signing in..." : "登录"}
        </button>
      </div>
    </div>
  )
}
