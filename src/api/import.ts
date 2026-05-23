import { requestJson } from "@/api/http"

export function startImport(body: { kbId: string; source: string }) {
  return requestJson<{ jobId: string }>("/import", { method: "POST", body })
}

