import { useMemo, useState } from "react"

const ONBOARDING_VERSION = "v1"

function getOnboardingStorageKey(username: string | null) {
  return `app.onboarding.completed.${ONBOARDING_VERSION}.${username ?? "anonymous"}`
}

function hasCompletedOnboarding(username: string | null) {
  try {
    return Boolean(localStorage.getItem(getOnboardingStorageKey(username)))
  } catch {
    return false
  }
}

export function useOnboarding(username: string | null) {
  const storageKey = useMemo(() => getOnboardingStorageKey(username), [username])
  const [open, setOpen] = useState(() => !hasCompletedOnboarding(username))

  function complete() {
    try {
      localStorage.setItem(storageKey, new Date().toISOString())
    } catch {
      // ignore
    }
  }

  return {
    open,
    setOpen,
    openGuide: () => setOpen(true),
    complete,
  }
}
