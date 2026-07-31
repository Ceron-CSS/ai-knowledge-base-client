import { useEffect, useRef, useState } from "react"
import { MAX_COMPOSER_HEIGHT, MIN_COMPOSER_HEIGHT } from "@/features/assistantChat/constants/chat"

export function useChatComposer() {
  const [input, setInput] = useState("")
  const [composerExpanded, setComposerExpanded] = useState(false)
  const attachmentInputRef = useRef<HTMLInputElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  function adjustComposerHeight(textarea: HTMLTextAreaElement) {
    textarea.style.height = "auto"
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, MIN_COMPOSER_HEIGHT), MAX_COMPOSER_HEIGHT)
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > MAX_COMPOSER_HEIGHT ? "auto" : "hidden"
    setComposerExpanded(nextHeight > MIN_COMPOSER_HEIGHT)
  }

  useEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return
    adjustComposerHeight(textarea)
  }, [input])

  return {
    input,
    setInput,
    composerExpanded,
    attachmentInputRef,
    inputRef,
    adjustComposerHeight,
  }
}
