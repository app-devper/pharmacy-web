const API_BASE = import.meta.env.VITE_API_URL || ''

// pharmacy-api's 503 body when it cannot confirm the session (ADR-0016).
const IDENTITY_UNAVAILABLE = 'identity service unavailable'

/**
 * The pharmacy API could not confirm the user's session because the identity
 * store is unreachable. Temporary: the user stays signed in, a sale is kept
 * pending, and the request can be retried later.
 */
export class IdentityUnavailableError extends Error {
  constructor() {
    super('ยืนยันตัวตนไม่ได้ชั่วคราว กรุณาลองใหม่อีกครั้ง')
    this.name = 'IdentityUnavailableError'
  }
}

/**
 * `looksLikeNetworkError` — best-effort detection that the catch
 * block caught a network failure (dropped wifi, captive portal,
 * server unreachable) rather than a 4xx/5xx the backend deliberately
 * returned.
 *
 * Browser fetch surfaces these as `TypeError("Failed to fetch")` in
 * Chromium/Edge, `TypeError("NetworkError when attempting to fetch
 * resource")` in Firefox, and similar in Safari. apiFetch() re-throws
 * the TypeError verbatim.
 */
export function looksLikeNetworkError(e: unknown): boolean {
  if (!(e instanceof Error)) return false
  if (e.name === 'TypeError') return true
  return /failed to fetch|network|connection (refused|reset)|unreachable|offline/i.test(
    e.message,
  )
}

/** True when a request failed for a reason worth retrying later, not because the server rejected it. */
export function isTemporaryOutage(e: unknown): boolean {
  return e instanceof IdentityUnavailableError || looksLikeNetworkError(e)
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('Session expired')
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    if (res.status === 503 && text.includes(IDENTITY_UNAVAILABLE)) {
      throw new IdentityUnavailableError()
    }
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}
