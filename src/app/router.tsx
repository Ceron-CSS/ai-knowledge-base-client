import { Suspense, type ReactNode } from "react"
import { createBrowserRouter, Outlet, redirect } from "react-router-dom"
import { RequireAuth } from "@/features/auth"
import { AppLayout } from "@/features/layout"
import { lazyPage } from "@/app/lazyPage"
import { NotFoundPage, RouteErrorPage } from "@/app/pages"
import { PageFallback } from "@/app/PageFallback"

const LoginPage = lazyPage(() => import("@/features/auth/pages/LoginPage"), "LoginPage")
const HomePage = lazyPage(() => import("@/features/home/pages/HomePage"), "HomePage")
const KbPage = lazyPage(() => import("@/features/kb/pages/KbPage"), "KbPage")
const KbDetailPage = lazyPage(() => import("@/features/kb/pages/KbDetailPage"), "KbDetailPage")
const KbUploadPreviewPage = lazyPage(() => import("@/features/kb/pages/KbUploadPreviewPage"), "KbUploadPreviewPage")
const ModelProviderPage = lazyPage(() => import("@/features/modelProviders/pages/ModelProviderPage"), "ModelProviderPage")
const AssistantListPage = lazyPage(() => import("@/features/assistants/pages/AssistantListPage"), "AssistantListPage")
const AssistantEditPage = lazyPage(() => import("@/features/assistants/pages/AssistantEditPage"), "AssistantEditPage")
const AssistantChatPage = lazyPage(() => import("@/features/assistantChat/pages/AssistantChatPage"), "AssistantChatPage")

function withPageSuspense(element: ReactNode) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: withPageSuspense(<LoginPage />),
    errorElement: <RouteErrorPage layout="fullscreen" />,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      {
        element: <Outlet />,
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, loader: () => redirect("/home") },
          { path: "home", element: withPageSuspense(<HomePage />) },
          { path: "kb", element: withPageSuspense(<KbPage />) },
          { path: "kb/:id", element: withPageSuspense(<KbDetailPage />) },
          { path: "kb/:id/upload", element: withPageSuspense(<KbUploadPreviewPage />) },
          { path: "model-providers", element: withPageSuspense(<ModelProviderPage />) },
          { path: "assistants", element: withPageSuspense(<AssistantListPage />) },
          { path: "assistants/:id", element: withPageSuspense(<AssistantEditPage />) },
          { path: "assistants/:id/chat", element: withPageSuspense(<AssistantChatPage />) },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage layout="fullscreen" />,
  },
])
