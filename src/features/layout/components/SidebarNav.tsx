import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import { NAV_GROUPS } from "../constants/navItems"

type SidebarNavProps = {
  collapsed: boolean
}

export function SidebarNav({ collapsed }: SidebarNavProps) {
  return (
    <nav className="mt-1 flex flex-1 flex-col gap-4 overflow-y-auto">
      {NAV_GROUPS.map((group) => (
        <div key={group.id} className="flex flex-col gap-0.5">
          {!collapsed && group.label ? (
            <div className="px-2 pb-1 text-[11px] font-medium tracking-wider text-[#8590A6] uppercase">
              {group.label}
            </div>
          ) : null}
          {group.items.map(({ to, label, Icon, onboardingTarget }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/evals"}
              data-onboarding-target={onboardingTarget}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  "relative flex min-w-0 items-center rounded-md px-2 py-2 text-sm transition-colors",
                  collapsed ? "justify-center" : "gap-2",
                  isActive
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-accent/70 hover:text-sidebar-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span
                      aria-hidden
                      className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                    />
                  ) : null}
                  <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                  {collapsed ? null : (
                    <span className="min-w-0 flex-1 truncate whitespace-nowrap">{label}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}
