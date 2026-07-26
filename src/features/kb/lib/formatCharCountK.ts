export function formatCharCountK(value: number) {
  if (value <= 0) return "0K"
  return `${(value / 1000).toFixed(value >= 1000 ? 1 : 2)}K`
}
