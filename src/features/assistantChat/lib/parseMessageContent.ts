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
                (v.chunkIndex === undefined || typeof v.chunkIndex === "number")
              )
            })
            .map((item) => ({
              kbId: item.kbId,
              itemId: item.itemId,
              fileName: item.fileName,
              snippet: item.snippet,
              score: item.score,
              ...(typeof item.chunkIndex === "number" ? { chunkIndex: item.chunkIndex } : {}),
            }))
            .slice(0, 8)
        }
      } catch {
        citations = []
      }
    }
  }

  const start = baseContent.indexOf(ATTACHMENT_META_SEPARATOR)
  if (start === -1) return { text: baseContent, images: [], files: [], citations }
  const end = baseContent.indexOf(ATTACHMENT_META_END, start + ATTACHMENT_META_SEPARATOR.length)
  if (end === -1) return { text: baseContent, images: [], files: [], citations }
  const text = baseContent.slice(0, start)
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
