import { useEffect, useMemo, useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { getGithubLoginUrl, login, register } from "@/api/auth"
import { HttpError } from "@/api/http"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/authContext"
import { consumePostLoginRedirect } from "@/features/auth/redirectToLogin"

export function LoginPage() {
  const auth = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [password2, setPassword2] = useState("")
  const [oauthRedirect, setOauthRedirect] = useState<string | null>(null)
  const [oauthError, setOauthError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash
    if (!hash) return

    const params = new URLSearchParams(hash)
    const accessToken = params.get("accessToken")
    const redirectTo = params.get("redirectTo")
    const error = params.get("oauthError")

    if (accessToken) {
      auth.loginWithToken(accessToken)
      setOauthRedirect(redirectTo || "/home")
    } else if (error) {
      setOauthError(error)
    }

    window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`)
  }, [auth])

  const from = useMemo(() => {
    if (oauthRedirect) return oauthRedirect
    const stored = consumePostLoginRedirect()
    if (stored) return stored
    const s = location.state as { from?: string } | null
    return s?.from ?? "/"
  }, [location.state, oauthRedirect])

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

  const loginErrorText =
    loginMutation.isError
      ? loginMutation.error instanceof Error
        ? loginMutation.error.message
        : "登录失败，请检查用户名和密码"
      : null

  const registerErrorText = registerMutation.isError
    ? registerMutation.error instanceof HttpError
      ? registerMutation.error.code === "USERNAME_TAKEN"
        ? "该用户名已被注册"
        : registerMutation.error.code === "WEAK_PASSWORD"
          ? "密码至少需要 6 位"
          : registerMutation.error.code === "USERNAME_RESERVED"
            ? "该用户名不可用"
            : registerMutation.error.message
      : registerMutation.error instanceof Error
        ? registerMutation.error.message
        : "注册失败，请稍后再试"
    : null

  const oauthErrorText = oauthError
    ? oauthError === "GitHub login was cancelled"
      ? "GitHub 登录已取消"
      : oauthError === "GitHub login failed"
        ? "GitHub 登录失败，请稍后重试"
        : oauthError
    : null

  const errorText = mode === "login" ? loginErrorText : registerErrorText

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col rounded-lg border bg-background p-6" style={{ minHeight: 400 }}>
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
            {oauthErrorText ? <div className="mt-2 text-sm text-destructive">{oauthErrorText}</div> : null}
          </div>

          <Button
            className="mt-4 w-full"
            size="lg"
            disabled={!canSubmit}
            loading={mode === "login" ? loginMutation.isPending : registerMutation.isPending}
            loadingText={mode === "login" ? "正在登录" : "正在注册"}
            onClick={() => {
              if (mode === "login") loginMutation.mutate()
              if (mode === "register") registerMutation.mutate()
            }}
          >
            {mode === "login" ? "登录" : "注册"}
          </Button>

          {mode === "login" ? (
            <>
              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>或者</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#24292f] px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1f2428] focus:outline-none focus:ring-2 focus:ring-[#24292f]/30"
                type="button"
                onClick={() => {
                  window.location.assign(getGithubLoginUrl(from))
                }}
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 fill-current">
                  <path d="M8 0C3.58 0 0 3.58 0 8.05c0 3.57 2.29 6.59 5.47 7.66.4.07.55-.18.55-.39 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.6 1.23.85.72 1.23 1.87.88 2.33.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.91-3.64-4.05 0-.9.32-1.64.85-2.22-.08-.2-.37-1.02.08-2.13 0 0 .69-.22 2.25.85.65-.18 1.34-.27 2.03-.27.69 0 1.38.09 2.03.27 1.56-1.07 2.25-.85 2.25-.85.45 1.11.16 1.93.08 2.13.53.58.85 1.32.85 2.22 0 3.15-1.86 3.85-3.64 4.05.29.25.54.73.54 1.48 0 1.08-.01 1.95-.01 2.22 0 .21.15.46.55.39A8.02 8.02 0 0 0 16 8.05C16 3.58 12.42 0 8 0Z" />
                </svg>
                使用 GitHub 登录
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
