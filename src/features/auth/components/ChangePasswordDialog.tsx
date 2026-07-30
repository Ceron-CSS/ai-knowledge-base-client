import { useMemo, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { changePassword } from "@/api/auth"
import { HttpError } from "@/api/http"
import { Button, Dialog, Field, Input } from "@/components/ui"
import { useAuth } from "../context/authContext"
import { usePasswordPolicyConfig } from "../hooks/usePasswordPolicyConfig"
import { getPasswordFieldError, validatePasswordPolicy } from "../lib/passwordPolicy"

type ChangePasswordDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const auth = useAuth()
  const { data: passwordPolicy } = usePasswordPolicyConfig()
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const userInputs = useMemo(() => (auth.username ? [auth.username] : []), [auth.username])

  const canSubmit = useMemo(() => {
    if (!oldPassword || !newPassword || !confirmPassword || !passwordPolicy) return false
    if (newPassword !== confirmPassword) return false
    return validatePasswordPolicy(newPassword, passwordPolicy, { oldPassword, userInputs }).ok
  }, [oldPassword, newPassword, confirmPassword, passwordPolicy, userInputs])

  const pwdMutation = useMutation({
    mutationFn: () => changePassword({ oldPassword, newPassword }),
    onSuccess: () => {
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
      onOpenChange(false)
      auth.logout()
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setOldPassword("")
          setNewPassword("")
          setConfirmPassword("")
          onOpenChange(false)
        }
      }}
      title="修改密码"
    >
      <p className="text-sm text-muted-foreground">修改成功后会自动退出，需要重新登录</p>
      <Field
        className="mt-3"
        label={
          <>
            旧密码 <span className="text-destructive">*</span>
          </>
        }
      >
        <Input
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          placeholder="请输入旧密码"
        />
      </Field>
      <Field
        className="mt-3"
        label={
          <>
            新密码 <span className="text-destructive">*</span>
          </>
        }
        error={getPasswordFieldError(newPassword, passwordPolicy, { oldPassword, userInputs })}
      >
        <Input
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          type="password"
          autoComplete="new-password"
          placeholder={passwordPolicy?.placeholder ?? "请输入新密码"}
        />
      </Field>
      <Field
        className="mt-3"
        label={
          <>
            确认新密码 <span className="text-destructive">*</span>
          </>
        }
        error={
          confirmPassword && newPassword !== confirmPassword
            ? "两次输入的新密码不一致"
            : undefined
        }
      >
        <Input
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          type="password"
          autoComplete="new-password"
          placeholder="再次输入新密码"
        />
      </Field>
      {pwdMutation.isError ? (
        <div className="mt-3 text-sm text-destructive">
          {pwdMutation.error instanceof HttpError
            ? pwdMutation.error.message
            : pwdMutation.error instanceof Error
              ? pwdMutation.error.message
              : "修改失败"}
        </div>
      ) : null}
      <Button
        className="mt-4 w-full"
        variant="primary"
        size="dialog"
        disabled={!canSubmit}
        loading={pwdMutation.isPending}
        onClick={() => pwdMutation.mutate()}
      >
        修改密码
      </Button>
    </Dialog>
  )
}
