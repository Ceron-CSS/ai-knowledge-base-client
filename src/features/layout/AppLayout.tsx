import { useState } from "react"
import { NavLink, Outlet } from "react-router-dom"
import { BookOpen, Bot, ChevronLeft, ChevronRight, Cpu, Settings } from "lucide-react"

const navItems = [
  { to: "/kb", label: "知识库", Icon: BookOpen },
  { to: "/models", label: "模型供应商", Icon: Cpu },
  { to: "/assistants", label: "问答助手", Icon: Bot },
  { to: "/settings", label: "设置", Icon: Settings },
]

const SIDEBAR_COLLAPSED_KEY = "app.sidebarCollapsed"

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      if (!raw) return false
      return raw === "1" || raw.toLowerCase() === "true"
    } catch {
      return false
    }
  })

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "true" : "false")
      } catch {
        // ignore
      }
      return next
    })
  }

  return (
    <div className="flex h-svh overflow-hidden">
      <aside
        className={[
          "flex shrink-0 flex-col overflow-hidden border-r bg-background p-3 transition-[width] duration-200 ease-in-out",
          collapsed ? "w-16" : "w-64",
        ].join(" ")}
      >
        <div className={["flex items-center gap-2", collapsed ? "justify-center px-1 py-2" : "justify-between px-2 py-2"].join(" ")}>
          {collapsed ? null : (
            <div className="min-w-0 truncate text-l font-semibold" title="AI 知识库管理平台">
              AI 知识库管理平台
            </div>
          )}
          <button
            type="button"
            className="inline-flex cursor-pointer items-center justify-center rounded-md border px-2 py-1.5 text-sm hover:bg-muted/60"
            onClick={toggleCollapsed}
            title={collapsed ? "展开侧边栏" : "收起侧边栏"}
            aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="mt-2 flex flex-col gap-1">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                [
                  "flex min-w-0 items-center rounded-md px-2 py-2 text-sm",
                  collapsed ? "justify-center" : "gap-2",
                  isActive ? "bg-muted font-medium" : "hover:bg-muted/60",
                ].join(" ")
              }
            >
              <Icon className="h-4 w-4" />
              {collapsed ? null : <span className="min-w-0 flex-1 truncate whitespace-nowrap">{label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
