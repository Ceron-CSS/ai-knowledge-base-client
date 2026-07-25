import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { CircleHelp, KeyRound, LogOut, Settings } from "lucide-react"
import { ChangePasswordDialog, useAuth } from "@/features/auth"
import { cn } from "@/lib/utils"

type AppSettingsMenuProps = {
  collapsed: boolean
  onOpenOnboarding: () => void
}

export function AppSettingsMenu({ collapsed, onOpenOnboarding }: AppSettingsMenuProps) {
  const auth = useAuth()
  const canChangePassword = auth.provider !== "github"
  const displayName = auth.displayName ?? auth.username ?? "未命名用户"

  const [open, setOpen] = useState(false)
  const [pwdOpen, setPwdOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})

  const updateMenuPosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return

    const width = Math.max(rect.width, 144)
    const left = Math.min(Math.max(rect.left, 8), window.innerWidth - width - 8)

    setMenuStyle({
      position: "fixed",
      left,
      bottom: window.innerHeight - rect.top + 4,
      width,
    })
  }, [])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!open) return
      const target = e.target as Node | null
      if (target && triggerRef.current?.contains(target)) return
      if (target && menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    updateMenuPosition()
    window.addEventListener("resize", updateMenuPosition)
    window.addEventListener("scroll", updateMenuPosition, true)
    return () => {
      window.removeEventListener("resize", updateMenuPosition)
      window.removeEventListener("scroll", updateMenuPosition, true)
    }
  }, [open, collapsed, updateMenuPosition])

  return (
    <>
      <div ref={triggerRef} className={cn(!collapsed && "min-w-0 flex-1")}>
        <button
          type="button"
          data-onboarding-target="nav-settings"
          className={cn(
            "flex w-full items-center rounded-md px-2 py-2 text-sm",
            collapsed ? "justify-center" : "gap-2",
            open ? "bg-muted font-medium" : "hover:bg-muted/60",
          )}
          onClick={() => setOpen((v) => !v)}
          title={collapsed ? "设置" : undefined}
        >
          <Settings className="h-4 w-4" />
          {collapsed ? null : <span className="min-w-0 flex-1 truncate text-left whitespace-nowrap">设置</span>}
        </button>
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="z-50 min-w-36 rounded-md border bg-popover p-1 shadow-md"
              style={menuStyle}
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
                  onClick={() => {
                    setOpen(false)
                    setPwdOpen(true)
                  }}
                >
                  <KeyRound className="h-4 w-4" />
                  修改密码
                </button>
              )}
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted/60"
                onClick={() => {
                  setOpen(false)
                  onOpenOnboarding()
                }}
              >
                <CircleHelp className="h-4 w-4" />
                新手引导
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setOpen(false)
                  auth.logout()
                }}
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            </div>,
            document.body,
          )
        : null}

      <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} />
    </>
  )
}
