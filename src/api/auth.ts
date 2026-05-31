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
