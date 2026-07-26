import type { Kb } from "@/api/kb"

export function filterKbList(list: Kb[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return list
  return list.filter((kb) => {
    const name = kb.name?.toLowerCase() ?? ""
    const description = (kb.description ?? "").toLowerCase()
    return name.includes(q) || description.includes(q)
  })
}
