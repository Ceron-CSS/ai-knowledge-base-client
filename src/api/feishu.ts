import { requestJson } from "@/api/http"

export type FeishuUserInfo = {
  openId: string
  name: string
}

export type FeishuStatus = {
  connected: boolean
  user: FeishuUserInfo | null
  expiresAt: string | null
}

export type FeishuAuthorize = {
  authorizeUrl: string
  state: string
}

export type FeishuSourceItem = {
  id: string
  name: string
  type: string
  kind: string
  hasChild: boolean
}

export type FeishuImportDoc = {
  id: string
  name: string
  kind: string
  type: string
}

export type FeishuImportStatus = "importing" | "skipped_duplicate" | "failed"

export type FeishuImportResult = {
  docToken: string
  name: string
  status: FeishuImportStatus
  itemId: string | null
  errorCode: string | null
}

export function getFeishuStatus() {
  return requestJson<FeishuStatus>("/integrations/feishu/status")
}

export function createFeishuAuthorize(returnTo?: string) {
  return requestJson<FeishuAuthorize>("/integrations/feishu/authorize", {
    query: returnTo ? { returnTo } : undefined,
  })
}

export function listFeishuSources(params: {
  kind: "drive" | "wiki"
  folderToken?: string
  spaceId?: string
}) {
  return requestJson<{ items: FeishuSourceItem[] }>(
    "/integrations/feishu/sources",
    {
      query: {
        kind: params.kind,
        ...(params.folderToken ? { folderToken: params.folderToken } : {}),
        ...(params.spaceId ? { spaceId: params.spaceId } : {}),
      },
    }
  )
}

export function importFeishuDocs(
  kbId: string,
  docs: FeishuImportDoc[],
  links?: string[]
) {
  return requestJson<{ results: FeishuImportResult[] }>(
    "/integrations/feishu/import",
    {
      method: "POST",
      body: { kbId, docs, links: links ?? [] },
    }
  )
}

export function disconnectFeishu() {
  return requestJson<void>("/integrations/feishu/disconnect", {
    method: "POST",
  })
}
