import { HttpError, throwIfNotOk } from "@/api/http"

export function parseSseEventData(rawEvent: string) {
  const lines = rawEvent.split(/\r?\n/)
  const dataLines: string[] = []

  for (const line of lines) {
    if (!line || line.startsWith(":")) continue
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart())
    }
  }

  if (dataLines.length === 0) return null
  return dataLines.join("\n")
}

function findSseEventBoundary(buffer: string) {
  const crlfIdx = buffer.indexOf("\r\n\r\n")
  const lfIdx = buffer.indexOf("\n\n")
  if (crlfIdx === -1 && lfIdx === -1) return -1
  if (crlfIdx === -1) return lfIdx
  if (lfIdx === -1) return crlfIdx
  return Math.min(crlfIdx, lfIdx)
}

function sseBoundaryLength(buffer: string, idx: number) {
  return buffer.startsWith("\r\n\r\n", idx) ? 4 : 2
}

export async function* readSseJsonStream<T>(
  response: Response,
  validate: (parsed: unknown) => T | null,
): AsyncGenerator<T> {
  await throwIfNotOk(response)
  if (!response.body) throw new HttpError(0, "Missing response body")

  const reader = response.body.getReader()
  const decoder = new TextDecoder("utf-8")
  let buffer = ""

  const emitEvent = (rawEvent: string) => {
    const data = parseSseEventData(rawEvent)
    if (!data) return null
    try {
      const parsed = JSON.parse(data) as unknown
      return validate(parsed)
    } catch {
      return null
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    while (true) {
      const idx = findSseEventBoundary(buffer)
      if (idx === -1) break
      const boundaryLen = sseBoundaryLength(buffer, idx)
      const rawEvent = buffer.slice(0, idx)
      buffer = buffer.slice(idx + boundaryLen)
      const item = emitEvent(rawEvent)
      if (item !== null) yield item
    }
  }

  buffer += decoder.decode()
  const tail = buffer.trim()
  if (tail) {
    const item = emitEvent(tail)
    if (item !== null) yield item
  }
}

export async function readNdjsonStream<T>(
  response: Response,
  onItem: (item: T) => void,
  validate?: (parsed: unknown) => T | null,
) {
  await throwIfNotOk(response)
  if (!response.body) return

  const reader = response.body.getReader()
  const decoder = new TextDecoder("utf-8")
  let buffer = ""

  const emitLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed) return
    try {
      const parsed = JSON.parse(trimmed) as unknown
      const item = validate ? validate(parsed) : (parsed as T)
      if (item !== null && item !== undefined) onItem(item)
    } catch {
      // skip malformed lines
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ""
    for (const line of lines) emitLine(line)
  }

  buffer += decoder.decode()
  if (buffer) emitLine(buffer)
}
