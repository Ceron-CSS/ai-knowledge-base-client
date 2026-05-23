import { createBrowserRouter, Navigate } from "react-router-dom"
import { RequireAuth } from "@/features/auth/RequireAuth"
import { LoginPage } from "@/features/auth/LoginPage"
import { AppLayout } from "@/features/layout/AppLayout"
import { ChatPage } from "@/features/chat/ChatPage"
import { EntryPage } from "@/features/entry/EntryPage"
import { ImportPage } from "@/features/import/ImportPage"
import { KbPage } from "@/features/kb/KbPage"
import { KbDetailPage } from "@/features/kb/KbDetailPage"
import { SearchPage } from "@/features/search/SearchPage"
import { SettingsPage } from "@/features/settings/SettingsPage"

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/kb" replace /> },
      { path: "kb", element: <KbPage /> },
      { path: "kb/:id", element: <KbDetailPage /> },
      { path: "entry", element: <EntryPage /> },
      { path: "import", element: <ImportPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "chat", element: <ChatPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
])
