import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"

const SIDEBAR_COLLAPSED_KEY = "app.sidebarCollapsed"

function readCollapsed(): boolean {
  try {
    const raw = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (!raw) return false
    return raw === "1" || raw.toLowerCase() === "true"
  } catch {
    return false
  }
}

function writeCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "true" : "false")
  } catch {
    // ignore
  }
}

export function useSidebarCollapsed() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(readCollapsed)

  const isAutoCollapsedRoute = useMemo(
    () =>
      /^\/assistants\/[^/]+\/chat\/?$/.test(location.pathname) ||
      /^\/kb\/[^/]+\/upload\/?$/.test(location.pathname),
    [location.pathname],
  )
  const prevIsAutoCollapsedRoute = useRef(false)

  useEffect(() => {
    const wasAutoCollapsedRoute = prevIsAutoCollapsedRoute.current
    if (!wasAutoCollapsedRoute && isAutoCollapsedRoute) {
      setCollapsed(true)
    } else if (wasAutoCollapsedRoute && !isAutoCollapsedRoute) {
      setCollapsed(readCollapsed())
    }
    prevIsAutoCollapsedRoute.current = isAutoCollapsedRoute
  }, [isAutoCollapsedRoute])

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v
      writeCollapsed(next)
      return next
    })
  }

  return { collapsed, toggleCollapsed }
}
