export function clampMaxLength(value: number) {
  return Math.min(2000, Math.max(100, Math.round(value)))
}
