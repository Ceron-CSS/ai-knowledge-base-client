import { useMemo, useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { login, register } from "@/api/auth"
import { HttpError } from "@/api/http"
import { useAuth } from "@/features/auth/authContext"
import { consumePostLoginRedirect } from "@/features/auth/redirectToLogin"

export function LoginPage() {
  const auth = useAuth()
  const location = useLocation()
  const from = useMemo(() => {
    const stored = consumePostLoginRedirect()
    if (stored) return stored
    const s = location.state as { from?: string } | null
    return s?.from ?? "/"
  }, [location.state])

  const [mode, setMode] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [password2, setPassword2] = useState("")

  const loginMutation = useMutation({
    mutationFn: () => login({ username: username.trim(), password }),
    onSuccess: (data) => auth.loginWithToken(data.accessToken),
  })

  const registerMutation = useMutation({
    mutationFn: () => register({ username: username.trim(), password }),
    onSuccess: () => {
      setMode("login")
      setPassword("")
      setPassword2("")
      registerMutation.reset()
      loginMutation.reset()
    },
  })

  if (auth.isAuthed) return <Navigate to={from} replace />

  const trimmedUsername = username.trim()
  const passwordsMatch = password && password2 && password === password2
  const canSubmit =
    mode === "login"
      ? Boolean(trimmedUsername && password && !loginMutation.isPending)
      : Boolean(trimmedUsername && password && password2 && passwordsMatch && !registerMutation.isPending)

  const errorText =
    mode === "login"
      ? loginMutation.isError
        ? loginMutation.error instanceof Error
          ? loginMutation.error.message
          : "登录失败，请检查用户名和密码"
        : null
      : registerMutation.isError
        ? registerMutation.error instanceof HttpError
          ? registerMutation.error.code === "USERNAME_TAKEN"
            ? "该用户名已被注册"
            : registerMutation.error.code === "WEAK_PASSWORD"
              ? "密码至少 6 位"
              : registerMutation.error.code === "USERNAME_RESERVED"
                ? "该用户名不可用"
                : registerMutation.error.message
          : registerMutation.error instanceof Error
            ? registerMutation.error.message
            : "注册失败，请稍后再试"
        : null

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border bg-background p-6 flex flex-col" style={{ minHeight: 400 }}>
        <div className="flex items-center justify-center gap-2">
          <button
            className={`rounded-md px-3 py-1 text-sm ${mode === "login" ? "bg-primary text-primary-foreground" : "border"}`}
            type="button"
            onClick={() => {
              setMode("login")
              registerMutation.reset()
            }}
          >
            登录
          </button>
          <button
            className={`rounded-md px-3 py-1 text-sm ${mode === "register" ? "bg-primary text-primary-foreground" : "border"}`}
            type="button"
            onClick={() => {
              setMode("register")
              loginMutation.reset()
            }}
          >
            注册
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <div className="flex flex-col gap-2">
            <div>
              <label className="block text-sm font-medium">用户名</label>
              <input
                className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">密码</label>
              <input
                className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return
                  if (mode === "login") loginMutation.mutate()
                  if (mode === "register") registerMutation.mutate()
                }}
              />
            </div>

            {mode === "register" ? (
              <div>
                <label className="block text-sm font-medium">确认密码</label>
                <input
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="请再次输入密码"
                  type="password"
                  autoComplete="new-password"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") registerMutation.mutate()
                  }}
                />
                {password && password2 && password !== password2 ? (
                  <div className="mt-2 text-sm text-destructive">两次密码不一致</div>
                ) : null}
              </div>
            ) : null}

            {errorText ? <div className="mt-2 text-sm text-destructive">{errorText}</div> : null}
          </div>

          <button
            className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            disabled={!canSubmit}
            onClick={() => {
              if (mode === "login") loginMutation.mutate()
              if (mode === "register") registerMutation.mutate()
            }}
          >
            {mode === "login"
              ? loginMutation.isPending
                ? "正在登录..."
                : "登录"
              : registerMutation.isPending
                ? "正在注册..."
                : "注册"}
          </button>
        </div>
      </div>
    </div>
  )
}
