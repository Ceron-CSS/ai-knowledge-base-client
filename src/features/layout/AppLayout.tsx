import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { BookOpen, Bot, ChevronLeft, ChevronRight, Cpu, Home, KeyRound, LogOut, Settings } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { changePassword } from "@/api/auth"
import { useAuth } from "@/features/auth/authContext"
import { Dialog } from "@/components/ui/dialog"

const navItems = [
  { to: "/home", label: "首页", Icon: Home },
  { to: "/kb", label: "知识库", Icon: BookOpen },
  { to: "/models", label: "模型供应商", Icon: Cpu },
  { to: "/assistants", label: "问答助手", Icon: Bot },
]

const SIDEBAR_COLLAPSED_KEY = "app.sidebarCollapsed"

export function AppLayout() {
  const auth = useAuth()
  const location = useLocation()
  const canChangePassword = auth.provider !== "github"
  const displayName = auth.displayName ?? auth.username ?? "未命名用户"

  const [collapsed, setCollapsed] = useState(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      if (!raw) return false
      return raw === "1" || raw.toLowerCase() === "true"
    } catch {
      return false
    }
  })

  const isAssistantChatRoute = useMemo(
    () => /^\/assistants\/[^/]+\/chat\/?$/.test(location.pathname),
    [location.pathname],
  )

  useEffect(() => {
    if (isAssistantChatRoute) {
      setCollapsed(true)
    } else {
      setCollapsed(false)
    }
  }, [isAssistantChatRoute])

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

  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const settingsMenuRef = useRef<HTMLDivElement>(null)
  const [settingsMenuStyle, setSettingsMenuStyle] = useState<CSSProperties>({})

  const updateSettingsMenuPosition = useCallback(() => {
    const rect = settingsRef.current?.getBoundingClientRect()
    if (!rect) return

    const width = Math.max(rect.width, 144)
    const left = Math.min(Math.max(rect.left, 8), window.innerWidth - width - 8)

    setSettingsMenuStyle({
      position: "fixed",
      left,
      bottom: window.innerHeight - rect.top + 4,
      width,
    })
  }, [])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!settingsOpen) return
      const target = e.target as Node | null
      if (target && settingsRef.current?.contains(target)) return
      if (target && settingsMenuRef.current?.contains(target)) return
      setSettingsOpen(false)
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [settingsOpen])

  useEffect(() => {
    if (!settingsOpen) return
    updateSettingsMenuPosition()

    window.addEventListener("resize", updateSettingsMenuPosition)
    window.addEventListener("scroll", updateSettingsMenuPosition, true)
    return () => {
      window.removeEventListener("resize", updateSettingsMenuPosition)
      window.removeEventListener("scroll", updateSettingsMenuPosition, true)
    }
  }, [settingsOpen, collapsed, updateSettingsMenuPosition])

  const [pwdOpen, setPwdOpen] = useState(false)
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const canSubmit = useMemo(() => {
    if (!oldPassword || !newPassword || !confirmPassword) return false
    if (newPassword !== confirmPassword) return false
    if (newPassword.length < 6) return false
    return true
  }, [oldPassword, newPassword, confirmPassword])

  const pwdMutation = useMutation({
    mutationFn: () => changePassword({ oldPassword, newPassword }),
    onSuccess: () => {
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPwdOpen(false)
      auth.logout()
    },
  })

  function openPwdDialog() {
    setSettingsOpen(false)
    setOldPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setPwdOpen(true)
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
            <div className="min-w-0 truncate text-xl font-semibold" title="AI 知识库管理平台">
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

        <nav className="mt-2 flex flex-1 flex-col gap-1">
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

        <div ref={settingsRef} className="relative">
          <button
            type="button"
            className={[
              "flex w-full items-center rounded-md px-2 py-2 text-sm",
              collapsed ? "justify-center" : "gap-2",
              settingsOpen ? "bg-muted font-medium" : "hover:bg-muted/60",
            ].join(" ")}
            onClick={() => setSettingsOpen((v) => !v)}
            title={collapsed ? "设置" : undefined}
          >
            <Settings className="h-4 w-4" />
            {collapsed ? null : <span className="min-w-0 flex-1 truncate text-left whitespace-nowrap">设置</span>}
          </button>
          {settingsOpen && typeof document !== "undefined" ? createPortal(
            <div
              ref={settingsMenuRef}
              className="z-50 min-w-36 rounded-md border bg-popover p-1 shadow-md"
              style={settingsMenuStyle}
            >
              <div className="flex items-center gap-2 px-3 pt-2 pb-1 text-xs text-muted-foreground">
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current">
                  <path d="M8 8a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm0 1.5c-2.33 0-5 1.17-5 3.5V14h10v-.98c0-2.33-2.67-3.52-5-3.52Z" />
                </svg>
                <span className="min-w-0 truncate">{displayName}</span>
              </div>
              {canChangePassword && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted/60"
                  onClick={openPwdDialog}
                >
                  <KeyRound className="h-4 w-4" />
                  修改密码
                </button>
              )}
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setSettingsOpen(false)
                  auth.logout()
                }}
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            </div>,
            document.body,
          ) : null}
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto p-6">
        <Outlet />
      </main>

      <Dialog
        open={pwdOpen}
        onOpenChange={(open) => {
          if (!open) setPwdOpen(false)
        }}
        title="修改密码"
      >
        <p className="text-sm text-muted-foreground">修改成功后会自动退出，需要重新登录</p>
        <div className="mt-3">
          <label className="block text-sm font-medium">旧密码</label>
          <input
            className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            placeholder="请输入旧密码"
          />
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium">新密码</label>
          <input
            className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder="至少 6 位"
          />
        </div>
        <div className="mt-3">
          <label className="block text-sm font-medium">确认新密码</label>
          <input
            className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            placeholder="再次输入新密码"
          />
          {confirmPassword && newPassword !== confirmPassword ? (
            <div className="mt-1.5 text-sm text-destructive">两次输入的新密码不一致</div>
          ) : null}
        </div>
        {pwdMutation.isError ? (
          <div className="mt-3 text-sm text-destructive">
            {pwdMutation.error instanceof Error ? pwdMutation.error.message : "修改失败"}
          </div>
        ) : null}
        <button
          className="mt-4 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          disabled={!canSubmit || pwdMutation.isPending}
          onClick={() => pwdMutation.mutate()}
        >
          {pwdMutation.isPending ? "提交中..." : "修改密码"}
        </button>
      </Dialog>
    </div>
  )
}
