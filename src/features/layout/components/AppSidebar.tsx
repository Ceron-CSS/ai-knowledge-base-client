import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Button } from "@/components/ui"
import { cn } from "@/lib/utils"
import { AppSettingsMenu } from "./AppSettingsMenu"
import { SidebarNav } from "./SidebarNav"

type AppSidebarProps = {
  collapsed: boolean
  onToggleCollapsed: () => void
  onOpenOnboarding: () => void
}

export function AppSidebar({ collapsed, onToggleCollapsed, onOpenOnboarding }: AppSidebarProps) {
  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar p-3 transition-[width] duration-200 ease-in-out",
        collapsed ? "w-16" : "w-56",
      )}
    >
      <SidebarNav collapsed={collapsed} />

      <div className={cn("relative mt-2 flex items-center gap-0.5", collapsed && "flex-col")}>
        <AppSettingsMenu collapsed={collapsed} onOpenOnboarding={onOpenOnboarding} />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onToggleCollapsed}
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
          aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
      </div>
    </aside>
  )
}
