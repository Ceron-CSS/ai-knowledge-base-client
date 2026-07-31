import { useState, type MouseEvent } from "react"
import type { ActiveCitation, ParsedCitation } from "@/features/assistantChat/types"

export function useCitationPopover() {
  const [activeCitation, setActiveCitation] = useState<ActiveCitation | null>(null)

  function openCitationPopover(
    index: number,
    citations: ParsedCitation[],
    event: MouseEvent<HTMLButtonElement>,
  ) {
    const citation = citations[index]
    if (!citation) return

    const rect = event.currentTarget.getBoundingClientRect()
    const width = 520
    const left = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - width - 12))
    const top = Math.min(rect.bottom + 8, Math.max(12, window.innerHeight - 480))
    setActiveCitation({ index, citation, left, top })
  }

  return {
    activeCitation,
    setActiveCitation,
    openCitationPopover,
  }
}
