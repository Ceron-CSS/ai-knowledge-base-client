import { describe, expect, it } from "vitest"
import { parseSseEventData, readNdjsonStream, readSseJsonStream } from "@/api/http-stream"

function streamResponse(chunks: string[]) {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
  return new Response(body, { status: 200 })
}

function validateMessage(parsed: unknown) {
  if (!parsed || typeof parsed !== "object") return null
  const value = parsed as { type?: unknown; text?: unknown }
  if (typeof value.type !== "string") return null
  return { type: value.type, text: typeof value.text === "string" ? value.text : "" }
}

describe("parseSseEventData", () => {
  it("joins multi-line data and skips comments", () => {
    expect(parseSseEventData(": keep-alive\ndata: hello\ndata: world")).toBe("hello\nworld")
  })
})

describe("readSseJsonStream", () => {
  it("emits valid JSON events across chunk boundaries", async () => {
    const response = streamResponse([
      'data: {"type":"token","text":"hel',
      'lo"}\n\n',
      'data: {"type":"done"}\n\n',
      "data: not-json\n\n",
    ])

    const items = []
    for await (const item of readSseJsonStream(response, validateMessage)) {
      items.push(item)
    }

    expect(items).toEqual([
      { type: "token", text: "hello" },
      { type: "done", text: "" },
    ])
  })
})

describe("readNdjsonStream", () => {
  it("emits valid lines and keeps partial tail data", async () => {
    const response = streamResponse(['{"type":"chunk","text":"a"}\n{"type":"chunk"', ',"text":"b"}'])
    const items: Array<{ type: string; text: string }> = []

    await readNdjsonStream(response, (item) => items.push(item), validateMessage)

    expect(items).toEqual([
      { type: "chunk", text: "a" },
      { type: "chunk", text: "b" },
    ])
  })
})
