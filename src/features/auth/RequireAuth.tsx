import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/features/auth/authContext"

export function RequireAuth(props: { children: React.ReactNode }) {
  const auth = useAuth()
  const location = useLocation()

  if (!auth.isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return props.children
}
