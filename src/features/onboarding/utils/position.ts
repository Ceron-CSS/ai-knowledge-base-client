import type { CardPosition, Rect } from "../types"

export function readTargetRect(target: string): Rect | null {
  const el = document.querySelector<HTMLElement>(`[data-onboarding-target="${target}"]`)
  if (!el) return null
  el.scrollIntoView({ block: "nearest", inline: "nearest" })
  const rect = el.getBoundingClientRect()
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  }
}

export function getCardPosition(rect: Rect | null): CardPosition {
  const gap = 16
  const margin = 16
  const width = Math.min(440, Math.max(300, window.innerWidth - margin * 2))

  if (!rect) {
    return {
      top: Math.max(margin, (window.innerHeight - 360) / 2),
      left: Math.max(margin, (window.innerWidth - width) / 2),
      width,
      arrow: "top",
      arrowOffset: 32,
    }
  }

  const hasRoomRight = rect.right + gap + width <= window.innerWidth - margin
  const maxTop = Math.max(margin, window.innerHeight - 360)
  const top = Math.min(Math.max(rect.top - 8, margin), maxTop)

  if (hasRoomRight) {
    const arrowOffset = Math.min(Math.max(rect.top + rect.height / 2 - top, 36), 324)
    return {
      top: Math.max(top, margin),
      left: rect.right + gap,
      width,
      arrow: "left",
      arrowOffset,
    }
  }

  const left = Math.min(Math.max(rect.left, margin), window.innerWidth - width - margin)
  const arrowOffset = Math.min(Math.max(rect.left + rect.width / 2 - left, 32), width - 32)

  return {
    top: Math.min(Math.max(rect.bottom + gap, margin), maxTop),
    left,
    width,
    arrow: "top",
    arrowOffset,
  }
}
