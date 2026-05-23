import { NavLink, Outlet } from "react-router-dom"
import { BookOpen, Bot, FileText, Import, MessageCircle, Search, Settings } from "lucide-react"
import { useAuth } from "@/features/auth/authContext"

const navItems = [
  { to: "/kb", label: "知识库", Icon: BookOpen },
  { to: "/entry", label: "条目", Icon: FileText },
  { to: "/import", label: "导入", Icon: Import },
  { to: "/search", label: "检索", Icon: Search },
  { to: "/chat", label: "问答", Icon: MessageCircle },
  { to: "/assistants", label: "问答助手", Icon: Bot },
  { to: "/settings", label: "设置", Icon: Settings },
]

export function AppLayout() {
  const auth = useAuth()

  return (
    <div className="flex min-h-svh">
      <aside className="w-64 shrink-0 border-r bg-background p-3">
        <div className="px-2 py-2 text-sm font-semibold">AI知识库管理平台</div>
        <nav className="mt-2 flex flex-col gap-1">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  "flex items-center gap-2 rounded-md px-2 py-2 text-sm",
                  isActive ? "bg-muted font-medium" : "hover:bg-muted/60",
                ].join(" ")
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-2 pt-4">
          <button
            className="w-full rounded-md border px-3 py-2 text-sm hover:bg-muted/60"
            onClick={() => auth.logout()}
          >
            退出登录
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
