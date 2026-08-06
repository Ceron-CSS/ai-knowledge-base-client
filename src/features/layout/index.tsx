import { Outlet } from "react-router-dom"
import { useAuth } from "@/features/auth"
import { OnboardingGuide, useOnboarding } from "@/features/onboarding"
import { AppSidebar } from "./components/AppSidebar"
import { useSidebarCollapsed } from "./hooks/useSidebarCollapsed"

export function AppLayout() {
  const auth = useAuth()
  const { collapsed, toggleCollapsed } = useSidebarCollapsed()
  const onboarding = useOnboarding(auth.username)

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <AppSidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        onOpenOnboarding={onboarding.openGuide}
      />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
        <Outlet />
      </main>

      <OnboardingGuide
        open={onboarding.open}
        onOpenChange={onboarding.setOpen}
        onComplete={onboarding.complete}
      />
    </div>
  )
}
