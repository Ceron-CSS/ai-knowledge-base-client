const LEGACY_ACCESS_TOKEN_KEY = "akb_access_token"

/** Remove tokens written by older frontend versions after the HttpOnly-cookie migration. */
export function clearLegacyAccessToken() {
  try {
    localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY)
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}
