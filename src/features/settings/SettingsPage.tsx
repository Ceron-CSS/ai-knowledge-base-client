import { useMemo, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { LogOut } from "lucide-react"
import { changePassword } from "@/api/auth"
import { useAuth } from "@/features/auth/authContext"

export function SettingsPage() {
  const auth = useAuth()

  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const canSubmit = useMemo(() => {
    if (!oldPassword || !newPassword || !confirmPassword) return false
    if (newPassword !== confirmPassword) return false
    if (newPassword.length < 6) return false
    return true
  }, [oldPassword, newPassword, confirmPassword])

  const mutation = useMutation({
    mutationFn: () => changePassword({ oldPassword, newPassword }),
    onSuccess: () => {
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
      auth.logout()
    },
  })

  return (
    <div className="max-w-lg">
      <h1 className="text-lg font-semibold">设置</h1>

      <section className="mt-6 rounded-lg border bg-background p-4">
        <h2 className="text-sm font-medium">修改密码</h2>
        <p className="mt-1 text-sm text-muted-foreground">修改成功后会自动退出，需要重新登录。</p>

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
            <div className="mt-1.5 text-sm text-destructive">两次输入的新密码不一致。</div>
          ) : null}
        </div>

        {mutation.isError ? (
          <div className="mt-3 text-sm text-destructive">
            {mutation.error instanceof Error ? mutation.error.message : "修改失败"}
          </div>
        ) : null}

        <button
          className="mt-4 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          disabled={!canSubmit || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "提交中..." : "修改密码"}
        </button>

        <button
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          onClick={() => auth.logout()}
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </button>
      </section>
    </div>
  )
}

