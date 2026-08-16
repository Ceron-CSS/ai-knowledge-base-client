let pendingReopen = false

/**
 * One-shot "reopen the import dialog" flag shared between the OAuth bridge
 * and the KB page. A module flag (not an event) so it survives the page's
 * lazy chunk loading: the bridge sets it during AppLayout's mount, and the
 * KB page reads it when it finally mounts.
 */
export function requestReopenImportDialog() {
  pendingReopen = true
}

export function peekReopenImportDialog(): boolean {
  return pendingReopen
}

export function clearReopenImportDialog() {
  pendingReopen = false
}
