export const APP_TIME_ZONE = "Asia/Shanghai"

type DateTimeParts = {
  year: string
  month: string
  day: string
  hour: string
  minute: string
  second: string
}

type DateTimeFormatOptions = {
  includeSeconds?: boolean
  dateSeparator?: "-" | "/"
}

const TIME_ZONE_SUFFIX_RE = /(Z|[+-]\d{2}:?\d{2})$/i
const ISO_DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}[T ]/

function normalizeDateTimeInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  if (ISO_DATE_TIME_RE.test(trimmed) && !TIME_ZONE_SUFFIX_RE.test(trimmed)) {
    return `${trimmed.replace(" ", "T")}Z`
  }
  return trimmed
}

export function parseApiDateTime(value: string) {
  const date = new Date(normalizeDateTimeInput(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function getShanghaiParts(value: string | Date): DateTimeParts | null {
  const date = typeof value === "string" ? parseApiDateTime(value) : value
  if (!date || Number.isNaN(date.getTime())) return null

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    year: byType.year ?? "",
    month: byType.month ?? "",
    day: byType.day ?? "",
    hour: byType.hour ?? "",
    minute: byType.minute ?? "",
    second: byType.second ?? "",
  }
}

export function formatShanghaiDate(value: string | Date) {
  const parts = getShanghaiParts(value)
  if (!parts) return typeof value === "string" ? value : ""
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function formatShanghaiDateTime(
  value: string | Date,
  { includeSeconds = false, dateSeparator = "-" }: DateTimeFormatOptions = {},
) {
  const parts = getShanghaiParts(value)
  if (!parts) return typeof value === "string" ? value : ""
  const date = `${parts.year}${dateSeparator}${parts.month}${dateSeparator}${parts.day}`
  const time = includeSeconds
    ? `${parts.hour}:${parts.minute}:${parts.second}`
    : `${parts.hour}:${parts.minute}`
  return `${date} ${time}`
}

export function shanghaiDateInputToUtcIso(value: string, boundary: "start" | "end") {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined

  const [, year, month, day] = match
  const hour = boundary === "start" ? 0 : 23
  const minute = boundary === "start" ? 0 : 59
  const second = boundary === "start" ? 0 : 59
  const millisecond = boundary === "start" ? 0 : 999
  const utc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    hour - 8,
    minute,
    second,
    millisecond,
  )
  return new Date(utc).toISOString()
}
