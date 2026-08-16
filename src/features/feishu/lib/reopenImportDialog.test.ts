import { beforeEach, describe, expect, it } from "vitest"
import {
  clearReopenImportDialog,
  peekReopenImportDialog,
  requestReopenImportDialog,
} from "./reopenImportDialog"

beforeEach(() => {
  clearReopenImportDialog()
})

describe("reopenImportDialog", () => {
  it("is false until requested", () => {
    expect(peekReopenImportDialog()).toBe(false)
  })

  it("flags a request and clears after consumption", () => {
    requestReopenImportDialog()
    expect(peekReopenImportDialog()).toBe(true)

    clearReopenImportDialog()
    expect(peekReopenImportDialog()).toBe(false)
  })
})
