export function getRequiredEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  if (!value) {
    throw new Error(`Missing required env: ${name}`)
  }
  return value
}

export const API_BASE_URL = getRequiredEnv("VITE_API_BASE_URL")

