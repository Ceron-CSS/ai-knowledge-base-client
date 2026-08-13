import { useEffect, useMemo, useState } from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { getGithubLoginUrl, login, register } from "@/api/auth"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuth } from "../context/authContext"
import { usePasswordPolicyConfig } from "../hooks/usePasswordPolicyConfig"
import { consumePostLoginRedirect, resolvePostLoginPath } from "../lib/redirect"
import { usePasswordPolicyValidation } from "../hooks/usePasswordPolicyValidation"
import { cn } from "@/lib/utils"

type OAuthHashResult = {
  accessToken: string | null
  redirectTo: string | null
  oauthError: string | null
  shouldClearHash: boolean
}

function parseOAuthHash(): OAuthHashResult {
  if (typeof window === "undefined") {
    return { accessToken: null, redirectTo: null, oauthError: null, shouldClearHash: false }
  }

  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash
  if (!hash) {
    return { accessToken: null, redirectTo: null, oauthError: null, shouldClearHash: false }
  }

  const params = new URLSearchParams(hash)
  const accessToken = params.get("accessToken")
  const redirectTo = params.get("redirectTo")
  const oauthError = params.get("oauthError")

  if (accessToken) {
    return { accessToken, redirectTo: redirectTo || "/home", oauthError: null, shouldClearHash: true }
  }
  if (oauthError) {
    return { accessToken: null, redirectTo: null, oauthError, shouldClearHash: true }
  }
  return { accessToken: null, redirectTo: null, oauthError: null, shouldClearHash: false }
}

export function LoginPage() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { data: passwordPolicy } = usePasswordPolicyConfig()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("test")
  const [password, setPassword] = useState("test")
  const [password2, setPassword2] = useState("")
  const [registerAttempted, setRegisterAttempted] = useState(false)
  const [oauthHash] = useState(parseOAuthHash)

  useEffect(() => {
    if (!oauthHash.accessToken) return
    auth.loginWithToken(oauthHash.accessToken)
  }, [auth, oauthHash.accessToken])

  useEffect(() => {
    if (!oauthHash.shouldClearHash) return
    window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`)
  }, [oauthHash.shouldClearHash])

  const from = useMemo(() => {
    if (oauthHash.redirectTo) return resolvePostLoginPath(oauthHash.redirectTo)
    const stored = consumePostLoginRedirect()
    if (stored) return stored
    const s = location.state as { from?: string } | null
    return resolvePostLoginPath(s?.from)
  }, [location.state, oauthHash.redirectTo])

  const loginMutation = useMutation({
    mutationFn: () => login({ username: username.trim(), password }),
    onSuccess: (data) => {
      auth.loginWithToken(data.accessToken)
      navigate(from, { replace: true })
    },
  })

  const registerMutation = useMutation({
    mutationFn: () => register({ username: username.trim(), password }),
    onSuccess: () => {
      setMode("login")
      setRegisterAttempted(false)
      setPassword("")
      setPassword2("")
      registerMutation.reset()
      loginMutation.reset()
    },
  })

  const trimmedUsername = username.trim()
  const registerPasswordOptions = useMemo(
    () => (trimmedUsername ? { userInputs: [trimmedUsername] } : undefined),
    [trimmedUsername],
  )
  const passwordsMatch = password && password2 && password === password2
  const registerPasswordCheck = usePasswordPolicyValidation(
    password,
    passwordPolicy,
    registerPasswordOptions,
    mode === "register",
  )

  if (auth.isAuthed) return <Navigate to={from} replace />

  const canSubmit =
    mode === "login"
      ? Boolean(trimmedUsername && password && !loginMutation.isPending)
      : Boolean(
          trimmedUsername &&
            password &&
            password2 &&
            passwordPolicy &&
            !registerMutation.isPending,
        )

  const loginErrorText =
    loginMutation.isError
      ? loginMutation.error instanceof Error
        ? loginMutation.error.message
        : "登录失败，请检查用户名和密码"
      : null

  const registerErrorText = registerMutation.isError
    ? registerMutation.error instanceof Error
      ? registerMutation.error.message
      : "注册失败，请稍后再试"
    : null

  const oauthErrorText = oauthHash.oauthError

  const errorText = mode === "login" ? loginErrorText : registerErrorText
  const passwordFieldError =
    registerAttempted &&
    mode === "register" &&
    password &&
    passwordPolicy &&
    !registerPasswordCheck.ok
      ? registerPasswordCheck.message
      : undefined
  const confirmPasswordError =
    registerAttempted && mode === "register" && password && password2 && password !== password2
      ? "两次密码不一致"
      : null
  const registerErrors = [passwordFieldError, confirmPasswordError, registerErrorText].filter(
    (message): message is string => Boolean(message),
  )

  const submitRegister = () => {
    if (!canSubmit) return
    setRegisterAttempted(true)
    if (!passwordsMatch || !registerPasswordCheck.ok) return
    registerMutation.mutate()
  }

  const switchMode = (next: "login" | "register") => {
    setMode(next)
    setRegisterAttempted(false)
    if (next === "login") registerMutation.reset()
    else loginMutation.reset()
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center p-6 sm:p-10">
      <img
        src="/login-bg.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />

      <div className="relative w-full max-w-md -translate-y-2.5">
        <div className="mb-4 flex flex-col items-center text-center">
          <h1 className="mt-4 px-2 text-xl font-semibold tracking-tight leading-snug sm:text-2xl">
            Agentic RAG 质量工程平台
          </h1>
        </div>

        <div className="rounded-2xl border bg-card/95 p-6 shadow-sm backdrop-blur-sm ring-1 ring-foreground/5 sm:p-8">
          <div
            className="relative grid grid-cols-2 rounded-lg bg-accent p-1"
            role="tablist"
            aria-label="登录或注册"
          >
            <div
              aria-hidden="true"
              className={cn(
                "absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-md bg-white shadow-[0_0_6px_rgba(0,0,0,0.08)] transition-[left] duration-200 ease-out",
                mode === "login" ? "left-1" : "left-1/2",
              )}
            />
            {(["login", "register"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={mode === tab}
                className={cn(
                  "relative z-10 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  mode === tab ? "text-primary" : "text-muted-foreground hover:text-primary/70",
                )}
                onClick={() => switchMode(tab)}
              >
                {tab === "login" ? "登录" : "注册"}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <Field label="用户名">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                autoComplete="username"
              />
            </Field>

            <Field label="密码">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === "register" ? (passwordPolicy?.placeholder ?? "请输入密码") : "请输入密码"
                }
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return
                  if (mode === "login") loginMutation.mutate()
                  if (mode === "register") submitRegister()
                }}
              />
            </Field>

            {mode === "register" ? (
              <Field label="确认密码">
                <Input
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="请再次输入密码"
                  type="password"
                  autoComplete="new-password"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitRegister()
                  }}
                />
              </Field>
            ) : null}

            {mode === "register" && registerErrors.length > 0 ? (
              <div className="-mt-2 space-y-1 text-sm text-destructive">
                {registerErrors.map((message) => (
                  <div key={message}>{message}</div>
                ))}
              </div>
            ) : null}

            {mode === "login" && errorText ? (
              <div className="text-sm text-destructive">{errorText}</div>
            ) : null}
            {oauthErrorText ? <div className="text-sm text-destructive">{oauthErrorText}</div> : null}
          </div>

          <Button
            className="mt-6 w-full"
            variant="primary"
            size="lg"
            disabled={!canSubmit}
            loading={mode === "login" ? loginMutation.isPending : registerMutation.isPending}
            onClick={() => {
              if (mode === "login") loginMutation.mutate()
              if (mode === "register") submitRegister()
            }}
          >
            {mode === "login" ? "登录" : "注册"}
          </Button>

          {mode === "login" ? (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>或者</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <button
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#383E4A] px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1f2428] focus:outline-none focus-visible:ring-3 focus-visible:ring-[#24292f]/30"
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
