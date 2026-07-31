import { useCallback, useState, type MouseEvent } from "react"
import { useNavigate } from "react-router-dom"
import { submitCitationFeedback } from "@/api/assistantChat"
import { getKbItemDetail } from "@/api/kb"
import { HttpError } from "@/api/http"
import { message } from "@/components/ui/message"
import { openKbItemChunk } from "@/features/kb/lib/openKbItemChunk"
import type { ActiveCitation, ParsedCitation } from "@/features/assistantChat/types"

type UseCitationPopoverOptions = {
  assistantId: string
}

function citationFeedbackKey(messageId: string, citationIndex: number) {
  return `${messageId}:${citationIndex}`
}

export function useCitationPopover({ assistantId }: UseCitationPopoverOptions) {
  const navigate = useNavigate()
  const [activeCitation, setActiveCitation] = useState<ActiveCitation | null>(null)
  const [openingSource, setOpeningSource] = useState(false)
  const [loadingFullChunk, setLoadingFullChunk] = useState(false)
  const [fullChunkText, setFullChunkText] = useState<string | null>(null)
  const [showingFullChunk, setShowingFullChunk] = useState(false)
  const [feedbackPending, setFeedbackPending] = useState(false)
  const [submittedFeedbackKeys, setSubmittedFeedbackKeys] = useState(() => new Set<string>())

  const resetActionState = useCallback(() => {
    setOpeningSource(false)
    setLoadingFullChunk(false)
    setFullChunkText(null)
    setShowingFullChunk(false)
    setFeedbackPending(false)
  }, [])

  const closeCitationPopover = useCallback(() => {
    setActiveCitation(null)
    resetActionState()
  }, [resetActionState])

  function openCitationPopover(
    index: number,
    citations: ParsedCitation[],
    event: MouseEvent<HTMLButtonElement>,
    messageId: string,
    conversationId: string,
  ) {
    const citation = citations[index]
    if (!citation || !messageId || !conversationId) return

    const rect = event.currentTarget.getBoundingClientRect()
    const width = 520
    const left = Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - width - 12))
    const top = Math.min(rect.bottom + 8, Math.max(12, window.innerHeight - 520))
    resetActionState()
    setActiveCitation({ index, citation, left, top, messageId, conversationId })
  }

  const feedbackSubmitted = activeCitation
    ? submittedFeedbackKeys.has(citationFeedbackKey(activeCitation.messageId, activeCitation.index))
    : false

  const openSource = useCallback(async () => {
    if (!activeCitation) return
    setOpeningSource(true)
    try {
      await openKbItemChunk(navigate, {
        kbId: activeCitation.citation.kbId,
        itemId: activeCitation.citation.itemId,
        chunkIndex: activeCitation.citation.chunkIndex,
      })
      setActiveCitation(null)
      resetActionState()
    } catch (e) {
      message.error(e instanceof HttpError || e instanceof Error ? e.message : "打开原文失败")
      setOpeningSource(false)
    }
  }, [activeCitation, navigate, resetActionState])

  const viewFullChunk = useCallback(async () => {
    if (!activeCitation) return
    if (showingFullChunk && fullChunkText) {
      setShowingFullChunk(false)
      return
    }
    if (fullChunkText) {
      setShowingFullChunk(true)
      return
    }

    setLoadingFullChunk(true)
    try {
      const detail = await getKbItemDetail(activeCitation.citation.kbId, activeCitation.citation.itemId)
      const chunkIndex = activeCitation.citation.chunkIndex
      const chunkText =
        typeof chunkIndex === "number" && chunkIndex >= 0 && chunkIndex < detail.chunks.length
          ? detail.chunks[chunkIndex]
          : (detail.chunks.find((chunk) => chunk.includes(activeCitation.citation.snippet.slice(0, 80))) ??
            activeCitation.citation.snippet)
      setFullChunkText(chunkText || activeCitation.citation.snippet)
      setShowingFullChunk(true)
    } catch (e) {
      message.error(e instanceof HttpError || e instanceof Error ? e.message : "加载完整分片失败")
    } finally {
      setLoadingFullChunk(false)
    }
  }, [activeCitation, fullChunkText, showingFullChunk])

  const copyCitation = useCallback(async () => {
    if (!activeCitation) return
    const { citation, index } = activeCitation
    const text = [`[${index + 1}] ${citation.fileName}`, citation.snippet, `相关度 ${citation.score.toFixed(3)}`].join(
      "\n",
    )
    try {
      await navigator.clipboard.writeText(text)
      message.success("已复制引用")
    } catch {
      message.error("复制失败，请检查浏览器剪贴板权限")
    }
  }, [activeCitation])

  const feedbackIrrelevant = useCallback(async () => {
    if (!activeCitation || feedbackPending) return
    const key = citationFeedbackKey(activeCitation.messageId, activeCitation.index)
    if (submittedFeedbackKeys.has(key)) return

    setFeedbackPending(true)
    try {
      await submitCitationFeedback({
        assistantId,
        conversationId: activeCitation.conversationId,
        messageId: activeCitation.messageId,
        body: {
          citationIndex: activeCitation.index,
          kbId: activeCitation.citation.kbId,
          itemId: activeCitation.citation.itemId,
          chunkIndex: activeCitation.citation.chunkIndex,
          fileName: activeCitation.citation.fileName,
          snippet: activeCitation.citation.snippet,
          feedback: "irrelevant",
        },
      })
      setSubmittedFeedbackKeys((prev) => new Set(prev).add(key))
      message.success("已反馈：引用无关")
    } catch (e) {
      message.error(e instanceof HttpError || e instanceof Error ? e.message : "反馈失败")
    } finally {
      setFeedbackPending(false)
    }
  }, [activeCitation, assistantId, feedbackPending, submittedFeedbackKeys])

  return {
    activeCitation,
    closeCitationPopover,
    openCitationPopover,
    openingSource,
    loadingFullChunk,
    fullChunkText,
    showingFullChunk,
    feedbackPending,
    feedbackSubmitted,
    openSource,
    viewFullChunk,
    copyCitation,
    feedbackIrrelevant,
  }
}
