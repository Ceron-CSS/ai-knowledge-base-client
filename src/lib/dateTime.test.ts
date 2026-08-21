import { describe, expect, it } from "vitest"
import {
  formatShanghaiDate,
  formatShanghaiDateTime,
  shanghaiDateInputToUtcIso,
} from "@/lib/dateTime"

describe("dateTime", () => {
  it("treats timezone-less API timestamps as UTC and displays Shanghai time", () => {
    expect(formatShanghaiDateTime("2026-08-21T02:03:04")).toBe("2026-08-21 10:03")
    expect(formatShanghaiDateTime("2026-08-21T02:03:04", { includeSeconds: true })).toBe(
      "2026-08-21 10:03:04",
    )
  })

  it("keeps explicit UTC timestamps consistent in Shanghai time", () => {
    expect(formatShanghaiDate("2026-08-20T18:30:00Z")).toBe("2026-08-21")
  })

  it("converts Shanghai date input boundaries to UTC ISO timestamps", () => {
    expect(shanghaiDateInputToUtcIso("2026-08-21", "start")).toBe(
      "2026-08-20T16:00:00.000Z",
    )
    expect(shanghaiDateInputToUtcIso("2026-08-21", "end")).toBe(
      "2026-08-21T15:59:59.999Z",
    )
  })
})
