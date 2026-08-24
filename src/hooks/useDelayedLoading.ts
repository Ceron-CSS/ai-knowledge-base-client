import { useEffect, useState } from "react"

export const DEFAULT_LOADING_DELAY_MS = 200

export function useDelayedLoading(
  loading: boolean,
  delayMs = DEFAULT_LOADING_DELAY_MS
) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(
      () => setVisible(loading),
      loading ? Math.max(0, delayMs) : 0
    )
    return () => window.clearTimeout(timer)
  }, [delayMs, loading])

  return visible
}
