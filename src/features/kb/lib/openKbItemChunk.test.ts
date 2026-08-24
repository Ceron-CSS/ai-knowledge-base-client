import { describe, expect, it, vi } from "vitest"
import { buildKbItemChunkPath, openKbItemChunk } from "@/features/kb/lib/openKbItemChunk"

describe("buildKbItemChunkPath", () => {
  it("prefers source view and preserves page and chunk context", () => {
    expect(
      buildKbItemChunkPath({
        kbId: "kb-1",
        itemId: "item-1",
        pageStart: 2.8,
        chunkIndex: 4.2,
        chunkId: "chunk-1",
      }),
    ).toBe("/item/kb-1/item-1?tab=source&page=2&chunkIndex=4&chunk=chunk-1")
  })

  it("opens chunk view when source preference is disabled and no page exists", () => {
    expect(
      buildKbItemChunkPath({
        kbId: "kb-1",
        itemId: "item-1",
        chunkIndex: -2,
        preferSource: false,
      }),
    ).toBe("/item/kb-1/item-1?tab=chunks&chunkIndex=0")
  })
})

describe("openKbItemChunk", () => {
  it("navigates to the built document detail path", () => {
    const navigate = vi.fn()

    openKbItemChunk(navigate, {
      kbId: "kb-1",
      itemId: "item-1",
      chunkId: "chunk-1",
    })

    expect(navigate).toHaveBeenCalledWith("/item/kb-1/item-1?tab=source&chunk=chunk-1")
  })
})
