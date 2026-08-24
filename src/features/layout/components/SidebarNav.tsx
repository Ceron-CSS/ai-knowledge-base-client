import { NavLink, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { NAV_GROUPS } from "../constants/navItems"

type SidebarNavProps = {
  collapsed: boolean
}

export function SidebarNav({ collapsed }: SidebarNavProps) {
  const location = useLocation()

  return (
    <nav className={cn("mt-1 flex flex-1 flex-col overflow-y-auto", collapsed ? "gap-1" : "gap-4")}>
      {NAV_GROUPS.map((group) => (
        <div key={group.id} className={cn("flex flex-col", collapsed ? "gap-1" : "gap-0.5")}>
          {!collapsed && group.label ? (
            <div className="px-2 pb-1 text-[11px] font-medium tracking-wider text-[#8590A6] uppercase">
              {group.label}
            </div>
          ) : null}
          {group.items.map(({ to, label, Icon, onboardingTarget }) => {
            const active = isNavItemActive(location.pathname, to, location.state)

            return (
              <NavLink
                key={to}
                to={to}
                data-onboarding-target={onboardingTarget}
                title={collapsed ? label : undefined}
                className={cn(
                  "relative flex min-w-0 items-center rounded-md px-2 py-2 text-sm transition-colors",
                  collapsed ? "justify-center" : "gap-2",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-accent/70 hover:text-sidebar-foreground",
                )}
              >
                <>
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                    />
                  ) : null}
                  <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                  {collapsed ? null : (
                    <span className="min-w-0 flex-1 truncate whitespace-nowrap">{label}</span>
                  )}
                </>
              </NavLink>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

function isNavItemActive(pathname: string, to: string, state: unknown) {
  const kbItemOrigin =
    state && typeof state === "object" && "kbItemOrigin" in state
      ? (state as { kbItemOrigin?: unknown }).kbItemOrigin
      : null
  if (to === "/evals") {
    return pathname.startsWith("/evals") && !pathname.startsWith("/evals/policies")
  }
  if (to === "/items") {
    return pathname === "/items" || kbItemOrigin === "items"
  }
  if (to === "/kb") {
    return pathname === "/kb" || (kbItemOrigin !== "items" && /^\/kb\//.test(pathname))
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}
