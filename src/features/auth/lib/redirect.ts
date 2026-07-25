const POST_LOGIN_KEY = "auth.postLoginRedirect"

export function redirectToLogin(postLoginRedirect?: string) {
  if (typeof window === "undefined") return
  if (window.location.pathname === "/login") return

  if (postLoginRedirect) {
    try {
      sessionStorage.setItem(POST_LOGIN_KEY, postLoginRedirect)
    } catch {
      // ignore
    }
  }

  try {
    window.history.replaceState({}, "", "/login")
    window.dispatchEvent(new PopStateEvent("popstate"))
  } catch {
    window.location.assign("/login")
  }
}

export function consumePostLoginRedirect(): string | undefined {
  try {
    const v = sessionStorage.getItem(POST_LOGIN_KEY) || undefined
    if (v) sessionStorage.removeItem(POST_LOGIN_KEY)
    return v || undefined
  } catch {
    return undefined
  }
}
