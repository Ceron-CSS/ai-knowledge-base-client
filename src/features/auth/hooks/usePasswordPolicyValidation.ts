import { useEffect, useState, type Dispatch, type SetStateAction } from "react"
import type { PasswordPolicyConfig } from "@/api/auth"
import {
  preloadPasswordStrengthChecker,
  validatePasswordPolicy,
  type PasswordPolicyOptions,
} from "../lib/passwordPolicy"

type PasswordValidationResult = { ok: true } | { ok: false; message: string }

function serializePasswordOptions(options: PasswordPolicyOptions | undefined) {
  const userInputs = (options?.userInputs ?? []).join("\0")
  const oldPassword = options?.oldPassword ?? ""
  return `${oldPassword}\u0001${userInputs}`
}

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
  const optionsKey = serializePasswordOptions(options)

  useEffect(() => {
    if (enabled) return
    setValid(setValidation)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    void preloadPasswordStrengthChecker()
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    if (!password || !config) {
      setValid(setValidation)
      return
    }

    let cancelled = false
    void validatePasswordPolicy(password, config, options).then((result) => {
      if (!cancelled) setValidation(result)
    })

    return () => {
      cancelled = true
    }
  }, [password, config, optionsKey, enabled])

  return validation
}
