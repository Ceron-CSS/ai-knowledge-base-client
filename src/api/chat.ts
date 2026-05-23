import { requestJson } from "@/api/http"

export function chat(body: { kbId: string; message: string }) {
  return requestJson<{ reply: string }>("/chat", { method: "POST", body })
}

