/** Client-side pre-check only. Rules and copy come from the backend password policy API. */

import type { PasswordPolicyConfig } from "@/api/auth"

export type PasswordPolicyOptions = {
  oldPassword?: string
  userInputs?: string[]
}

type PasswordValidationResult = { ok: true } | { ok: false; message: string }

type ZxcvbnChecker = {
  check: (password: string, userInputs: string[]) => { score: number }
}

let zxcvbnLoader: Promise<ZxcvbnChecker> | null = null

export function preloadPasswordStrengthChecker(): Promise<ZxcvbnChecker> {
  if (!zxcvbnLoader) {
    zxcvbnLoader = Promise.all([
      import("@zxcvbn-ts/core"),
      import("@zxcvbn-ts/language-common"),
      import("@zxcvbn-ts/language-en"),
      import("@zxcvbn-ts/language-zh"),
    ]).then(([core, common, en, zh]) =>
      new core.ZxcvbnFactory({
        graphs: common.adjacencyGraphs,
        dictionary: {
          ...common.dictionary,
          ...en.dictionary,
          ...zh.dictionary,
        },
      }),
    )
  }
  return zxcvbnLoader
}

function collectUserInputs(options?: PasswordPolicyOptions): string[] {
  return (options?.userInputs ?? []).map((value) => value.trim()).filter(Boolean)
}

function validatePasswordPolicySync(
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

  return { ok: true }
}

export async function validatePasswordPolicy(
  password: string,
  config: PasswordPolicyConfig,
  options?: PasswordPolicyOptions,
): Promise<PasswordValidationResult> {
  const syncResult = validatePasswordPolicySync(password, config, options)
  if (!syncResult.ok) return syncResult

  const zxcvbn = await preloadPasswordStrengthChecker()
  const result = zxcvbn.check(password, collectUserInputs(options))
  if (result.score < config.minScore) {
    return { ok: false, message: config.messages.COMMON_PASSWORD }
  }

  return { ok: true }
}
