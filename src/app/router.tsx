import { createBrowserRouter, Navigate } from "react-router-dom"
import { LoginPage, RequireAuth } from "@/features/auth"
import { AppLayout } from "@/features/layout"
import { AssistantListPage, AssistantEditPage } from "@/features/assistants"
import { KbPage, KbDetailPage, KbUploadPreviewPage } from "@/features/kb"
import { HomePage } from "@/features/home"
import { ModelProviderPage } from "@/features/models/ModelProviderPage"
import { AssistantChatPage } from "@/features/assistantChat"

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
      { index: true, element: <Navigate to="/home" replace /> },
      { path: "home", element: <HomePage /> },
      { path: "kb", element: <KbPage /> },
      { path: "kb/:id", element: <KbDetailPage /> },
      { path: "kb/:id/upload", element: <KbUploadPreviewPage /> },
      { path: "models", element: <ModelProviderPage /> },
      { path: "assistants", element: <AssistantListPage /> },
      { path: "assistants/:id", element: <AssistantEditPage /> },
      { path: "assistants/:id/chat", element: <AssistantChatPage /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
])
