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

