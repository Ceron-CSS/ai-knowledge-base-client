import { useEffect, useMemo, useState } from "react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { BookOpen, Bot, ChevronLeft, ChevronRight, FileText, Import, MessageCircle, Search, Settings } from "lucide-react"

const navItems = [
  { to: "/kb", label: "知识库", Icon: BookOpen },
  { to: "/entry", label: "条目", Icon: FileText },
  { to: "/import", label: "导入", Icon: Import },
  { to: "/search", label: "搜索", Icon: Search },
  { to: "/chat", label: "问答", Icon: MessageCircle },
  { to: "/assistants", label: "问答助手", Icon: Bot },
  { to: "/settings", label: "设置", Icon: Settings },
]

const SIDEBAR_COLLAPSED_KEY = "app.sidebarCollapsed"

export function AppLayout() {
  const location = useLocation()

  const [collapsed, setCollapsed] = useState(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      if (!raw) return false
      return raw === "1" || raw.toLowerCase() === "true"
    } catch {
      return false
    }
  })

  const isAssistantChatRoute = useMemo(() => /^\/assistants\/[^/]+\/chat\/?$/.test(location.pathname), [location.pathname])

  useEffect(() => {
    if (isAssistantChatRoute) setCollapsed(true)
  }, [isAssistantChatRoute])

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "true" : "false")
    } catch {
      // ignore
    }
  }, [collapsed])

  return (
    <div className="flex min-h-svh">
      <aside
        className={[
          "shrink-0 overflow-hidden border-r bg-background p-3 transition-[width] duration-200 ease-in-out",
          collapsed ? "w-16" : "w-64",
        ].join(" ")}
      >
        <div className={["flex items-center gap-2", collapsed ? "justify-center px-1 py-2" : "justify-between px-2 py-2"].join(" ")}>
          {collapsed ? null : (
            <div className="min-w-0 truncate text-l font-semibold" title="AI知识库管理平台">
              AI知识库管理平台
            </div>
          )}
          <button
            type="button"
            className="inline-flex cursor-pointer items-center justify-center rounded-md border px-2 py-1.5 text-sm hover:bg-muted/60"
            onClick={() => setCollapsed((v) => !v)}
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

      <main className="min-w-0 flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}

