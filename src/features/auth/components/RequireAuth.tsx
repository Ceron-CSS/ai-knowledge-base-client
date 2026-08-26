import { Navigate, useLocation } from "react-router-dom"
import { resolvePostLoginPath } from "../lib/redirect"
import { useAuth } from "../context/authContext"
import { PageFallback } from "@/app/PageFallback"

export function RequireAuth(props: { children: React.ReactNode }) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.isLoading) return <PageFallback />

  if (!auth.isAuthed) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: resolvePostLoginPath(location.pathname) }}
      />
    )
  }

  return props.children
}
