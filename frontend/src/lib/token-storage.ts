import { config } from "@/config"

/**
 * Iframe-safe token storage. This app runs inside a GHL Custom Menu Link
 * iframe where third-party cookies are routinely blocked, so tokens live in
 * localStorage (partitioned but available) with an in-memory fallback for
 * browsers that block iframe storage entirely. Tokens are always sent via
 * the Authorization header — never cookies.
 */

const memoryStore = new Map<string, string>()

function storageAvailable(): boolean {
  if (typeof window === "undefined") return false
  try {
    const probe = "__storage_probe__"
    window.localStorage.setItem(probe, "1")
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

function get(key: string): string | undefined {
  if (storageAvailable()) return window.localStorage.getItem(key) ?? undefined
  return memoryStore.get(key)
}

function set(key: string, value: string): void {
  if (storageAvailable()) {
    window.localStorage.setItem(key, value)
  } else {
    memoryStore.set(key, value)
  }
}

function remove(key: string): void {
  if (storageAvailable()) window.localStorage.removeItem(key)
  memoryStore.delete(key)
}

export const tokenStorage = {
  getAccessToken: () => get(config.auth.tokenKey),
  getRefreshToken: () => get(config.auth.refreshTokenKey),
  setTokens(accessToken: string, refreshToken?: string) {
    set(config.auth.tokenKey, accessToken)
    if (refreshToken) set(config.auth.refreshTokenKey, refreshToken)
  },
  clear() {
    remove(config.auth.tokenKey)
    remove(config.auth.refreshTokenKey)
  },
}
