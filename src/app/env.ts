export function getEnv(name: keyof ImportMetaEnv): string | undefined {
  const value = import.meta.env[name]
  return value || undefined
}

export function getApiBaseUrl(): string {
  const value = getEnv("VITE_API_BASE_URL")
  if (!value) {
    throw new Error("Missing required env: VITE_API_BASE_URL")
  }
  return value
}
