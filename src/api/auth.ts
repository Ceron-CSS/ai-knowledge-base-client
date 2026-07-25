import { getApiBaseUrl } from "@/app/env"
import { requestJson } from "@/api/http"

export type LoginRequest = {
  username: string
  password: string
}

export type LoginResponse = {
  accessToken: string
}

export function login(body: LoginRequest) {
  return requestJson<LoginResponse>("/auth/login", { method: "POST", body })
}

export type RegisterRequest = {
  username: string
  password: string
}

export function register(body: RegisterRequest) {
  return requestJson<void>("/auth/register", { method: "POST", body })
}

export type ChangePasswordRequest = {
  oldPassword: string
  newPassword: string
}

export function changePassword(body: ChangePasswordRequest) {
  return requestJson<void>("/auth/change-password", { method: "POST", body })
}

export type PasswordPolicyConfig = {
  minLength: number
  minScore: number
  placeholder: string
  messages: {
    WEAK_PASSWORD: string
    COMMON_PASSWORD: string
    SAME_AS_OLD: string
  }
}

export function getPasswordPolicyConfig() {
  return requestJson<PasswordPolicyConfig>("/auth/password-policy")
}

export function getGithubLoginUrl(redirectTo?: string) {
  const url = new URL("auth/github", `${getApiBaseUrl().replace(/\/+$/, "")}/`)
  if (redirectTo) {
    url.searchParams.set("redirectTo", redirectTo)
  }
  return url.toString()
}
