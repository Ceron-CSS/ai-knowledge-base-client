import { createBrowserRouter, Navigate } from "react-router-dom"
import { RequireAuth } from "@/features/auth/RequireAuth"
import { LoginPage } from "@/features/auth/LoginPage"
import { AppLayout } from "@/features/layout/AppLayout"
import { AssistantListPage } from "@/features/assistants/AssistantListPage"
import { AssistantEditPage } from "@/features/assistants/AssistantEditPage"
import { KbPage } from "@/features/kb/KbPage"
import { KbDetailPage } from "@/features/kb/KbDetailPage"
import { KbUploadPreviewPage } from "@/features/kb/KbUploadPreviewPage"
import { ModelProviderPage } from "@/features/models/ModelProviderPage"
import { SettingsPage } from "@/features/settings/SettingsPage"
import { AssistantChatPage } from "@/features/assistantChat/AssistantChatPage"

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
      { path: "kb/:id/upload", element: <KbUploadPreviewPage /> },
      { path: "models", element: <ModelProviderPage /> },
      { path: "assistants", element: <AssistantListPage /> },
      { path: "assistants/:id", element: <AssistantEditPage /> },
      { path: "assistants/:id/chat", element: <AssistantChatPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
])
