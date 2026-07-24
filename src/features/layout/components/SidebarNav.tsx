import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import { NAV_ITEMS } from "../constants/navItems"

type SidebarNavProps = {
  collapsed: boolean
}

export function SidebarNav({ collapsed }: SidebarNavProps) {
  return (
    <nav className="mt-2 flex flex-1 flex-col gap-1">
      {NAV_ITEMS.map(({ to, label, Icon, onboardingTarget }) => (
        <NavLink
          key={to}
          to={to}
          data-onboarding-target={onboardingTarget}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              "flex min-w-0 items-center rounded-md px-2 py-2 text-sm",
              collapsed ? "justify-center" : "gap-2",
              isActive ? "bg-muted font-medium" : "hover:bg-muted/60",
            )
          }
        >
          <Icon className="h-4 w-4" />
          {collapsed ? null : <span className="min-w-0 flex-1 truncate whitespace-nowrap">{label}</span>}
        </NavLink>
      ))}
    </nav>
  )
}
