export type ParsedImageAttachment = { kind: "image"; fileName?: string; dataUrl: string }
export type ParsedFileAttachment = { kind: "file"; fileName: string }
export type ParsedCitation = {
  kbId: string
  itemId: string
  fileName: string
  snippet: string
  score: number
  chunkIndex?: number
  pageStart?: number
  pageEnd?: number
}

export type ParsedMessageContent = {
  text: string
  images: ParsedImageAttachment[]
  files: ParsedFileAttachment[]
  citations: ParsedCitation[]
}
