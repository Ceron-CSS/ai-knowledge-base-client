/** Client-side pre-check only. Rules and copy come from the backend password policy API. */

import { ZxcvbnFactory } from "@zxcvbn-ts/core"
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common"
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-en"
import * as zxcvbnZhPackage from "@zxcvbn-ts/language-zh"
import type { PasswordPolicyConfig } from "@/api/auth"

export type PasswordPolicyOptions = {
  oldPassword?: string
  userInputs?: string[]
}

type PasswordValidationResult = { ok: true } | { ok: false; message: string }

const zxcvbn = new ZxcvbnFactory({
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
    ...zxcvbnZhPackage.dictionary,
  },
})

function collectUserInputs(options?: PasswordPolicyOptions): string[] {
  return (options?.userInputs ?? []).map((value) => value.trim()).filter(Boolean)
}

export function validatePasswordPolicy(
  password: string,
  config: PasswordPolicyConfig,
  options?: PasswordPolicyOptions,
): PasswordValidationResult {
  if (password.length < config.minLength) {
    return { ok: false, message: config.messages.WEAK_PASSWORD }
  }

  if (options?.oldPassword !== undefined && password === options.oldPassword) {
    return { ok: false, message: config.messages.SAME_AS_OLD }
  }

  const result = zxcvbn.check(password, collectUserInputs(options))
  if (result.score < config.minScore) {
    return { ok: false, message: config.messages.COMMON_PASSWORD }
  }

  return { ok: true }
}

export function getPasswordFieldError(
  password: string,
  config: PasswordPolicyConfig | undefined,
  options?: PasswordPolicyOptions,
): string | undefined {
  if (!password || !config) return undefined
  const result = validatePasswordPolicy(password, config, options)
  return result.ok ? undefined : result.message
}
