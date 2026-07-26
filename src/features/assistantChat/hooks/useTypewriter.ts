import { useEffect, useRef } from "react"

export function useTypewriter(onUpdate: (text: string) => void) {
  const queueRef = useRef("")
  const textRef = useRef("")
  const timerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    },
    [],
  )

  function stop() {
    queueRef.current = ""
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function flush() {
    const q = queueRef.current
    if (!q) return
    queueRef.current = ""
    textRef.current += q
    onUpdate(textRef.current)
  }

  function start() {
    if (timerRef.current !== null) return
    timerRef.current = window.setInterval(() => {
      const q = queueRef.current
      if (!q) return
      const maxChars = q.length > 2000 ? 120 : q.length > 1000 ? 80 : q.length > 400 ? 40 : q.length > 150 ? 20 : 8
      const chunk = q.slice(0, maxChars)
      queueRef.current = q.slice(maxChars)
      textRef.current += chunk
      onUpdate(textRef.current)
    }, 16)
  }

  function enqueue(delta: string) {
    queueRef.current += delta
    start()
  }

  function reset() {
    textRef.current = ""
  }

  return { enqueue, flush, stop, reset }
}
