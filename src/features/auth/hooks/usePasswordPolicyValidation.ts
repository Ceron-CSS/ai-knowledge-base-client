import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import type { PasswordPolicyConfig } from "@/api/auth"
import {
  preloadPasswordStrengthChecker,
  schedulePasswordStrengthCheckerPreload,
  validatePasswordPolicy,
  type PasswordPolicyOptions,
} from "../lib/passwordPolicy"

type PasswordValidationResult = { ok: true } | { ok: false; message: string }

function setValid(setValidation: Dispatch<SetStateAction<PasswordValidationResult>>) {
  setValidation((current) => (current.ok ? current : { ok: true }))
}

export function usePasswordPolicyValidation(
  password: string,
  config: PasswordPolicyConfig | undefined,
  options: PasswordPolicyOptions | undefined,
  enabled: boolean,
) {
  const [validation, setValidation] = useState<PasswordValidationResult>({ ok: true })
  const oldPassword = options?.oldPassword
  const userInputs = options?.userInputs

  const stableOptions = useMemo((): PasswordPolicyOptions | undefined => {
    if (oldPassword === undefined && !userInputs?.length) {
      return undefined
    }

    return {
      oldPassword,
      userInputs: userInputs?.length ? [...userInputs] : undefined,
    }
  }, [oldPassword, userInputs])

  useEffect(() => {
    if (enabled) return
    setValid(setValidation)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    const minLength = config?.minLength ?? 1
    if (password.length > 0 || password.length >= minLength) {
      void preloadPasswordStrengthChecker()
      return
    }

    return schedulePasswordStrengthCheckerPreload()
  }, [enabled, password, config?.minLength])

  useEffect(() => {
    if (!enabled) return

    if (!password || !config) {
      setValid(setValidation)
      return
    }

    let cancelled = false
    void validatePasswordPolicy(password, config, stableOptions).then((result) => {
      if (!cancelled) setValidation(result)
    })

    return () => {
      cancelled = true
    }
  }, [password, config, stableOptions, enabled])

  return validation
}
