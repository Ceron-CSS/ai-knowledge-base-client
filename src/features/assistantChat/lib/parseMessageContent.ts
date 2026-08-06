import {
  ATTACHMENT_META_END,
  ATTACHMENT_META_SEPARATOR,
  CITATION_META_END,
  CITATION_META_SEPARATOR,
} from "@/features/assistantChat/constants/chat"
import type {
  ParsedCitation,
  ParsedFileAttachment,
  ParsedImageAttachment,
  ParsedMessageContent,
} from "@/features/assistantChat/types"

export function parseMessageContent(content: string): ParsedMessageContent {
  const citationStart = content.indexOf(CITATION_META_SEPARATOR)
  let baseContent = content
  let citations: ParsedCitation[] = []
  if (citationStart !== -1) {
    const citationEnd = content.indexOf(CITATION_META_END, citationStart + CITATION_META_SEPARATOR.length)
    if (citationEnd !== -1) {
      baseContent = content.slice(0, citationStart)
      const citationRaw = content.slice(citationStart + CITATION_META_SEPARATOR.length, citationEnd).trim()
      try {
        const parsed = JSON.parse(citationRaw) as unknown
        if (Array.isArray(parsed)) {
          citations = parsed
            .filter((item): item is ParsedCitation => {
              if (!item || typeof item !== "object") return false
              const v = item as Record<string, unknown>
              return (
                typeof v.kbId === "string" &&
                typeof v.itemId === "string" &&
                typeof v.fileName === "string" &&
                typeof v.snippet === "string" &&
                typeof v.score === "number" &&
                (v.chunkIndex === undefined || typeof v.chunkIndex === "number") &&
                (v.pageStart === undefined || typeof v.pageStart === "number") &&
                (v.pageEnd === undefined || typeof v.pageEnd === "number")
              )
            })
            .map((item) => ({
              kbId: item.kbId,
              itemId: item.itemId,
              fileName: item.fileName,
              snippet: item.snippet,
              score: item.score,
              ...(typeof item.chunkIndex === "number" ? { chunkIndex: item.chunkIndex } : {}),
              ...(typeof item.pageStart === "number" ? { pageStart: item.pageStart } : {}),
              ...(typeof item.pageEnd === "number" ? { pageEnd: item.pageEnd } : {}),
            }))
            .slice(0, 8)
        }
      } catch {
        citations = []
      }
    }
  }

  citations = dedupeCitationsByChunk(citations)

  const start = baseContent.indexOf(ATTACHMENT_META_SEPARATOR)
  if (start === -1) {
    return { text: scrubDisplayText(baseContent), images: [], files: [], citations }
  }
  const end = baseContent.indexOf(ATTACHMENT_META_END, start + ATTACHMENT_META_SEPARATOR.length)
  if (end === -1) {
    return { text: scrubDisplayText(baseContent), images: [], files: [], citations }
  }
  const text = scrubDisplayText(baseContent.slice(0, start))
  const raw = baseContent.slice(start + ATTACHMENT_META_SEPARATOR.length, end).trim()
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return { text, images: [], files: [], citations }
    const images: ParsedImageAttachment[] = []
    const files: ParsedFileAttachment[] = []
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue
      const maybe = item as Record<string, unknown>
      if (maybe.kind === "image" && typeof maybe.dataUrl === "string") {
        images.push({
          kind: "image",
          fileName: typeof maybe.fileName === "string" ? maybe.fileName : undefined,
          dataUrl: maybe.dataUrl,
        })
      }
      if (maybe.kind === "file" && typeof maybe.fileName === "string") {
        files.push({ kind: "file", fileName: maybe.fileName })
      }
    }
    return { text, images, files, citations }
  } catch {
    return { text, images: [], files: [], citations }
  }
}

/** 展示侧清理旧消息里的检索套话 / 片段范围，避免 [6] 残留成不可点标记。 */
function scrubDisplayText(text: string) {
  return text
    .replace(/\[(\d{1,3})\]\s*[~\-–—～到至]\s*\[(\d{1,3})\]/g, "")
    .replace(/片段\s*(?:\[?\d{1,3}\]?\s*[~\-–—～到至]\s*\[?\d{1,3}\]?|\d{1,3}\s*[~\-–—～到至]\s*\d{1,3})/g, "")
    .replace(/(?:在您提供的|根据(?:您提供的)?|基于(?:提供的)?)\s*知识上下文[（(][^）)]*[）)]\s*中[，,、]?/g, "")
    .replace(/知识上下文[（(][^）)]*[）)]/g, "")
    .replace(/[（(]\s*[）)]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function dedupeCitationsByChunk(citations: ParsedCitation[]) {
  const seen = new Set<string>()
  const deduped: ParsedCitation[] = []
  for (const citation of citations) {
    const key = `${citation.itemId}:${citation.chunkIndex ?? ""}:${citation.fileName}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(citation)
  }
  return deduped
}

/** 引用来源列表按文档去重，正文 [n] 仍按分片索引对应。 */
export function dedupeCitationsByItem(citations: ParsedCitation[]) {
  const seen = new Set<string>()
  const deduped: ParsedCitation[] = []
  for (const citation of citations) {
    const key = citation.itemId || citation.fileName
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(citation)
  }
  return deduped
}
