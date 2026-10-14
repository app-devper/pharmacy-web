// pharmacy-api's 503 body when it cannot confirm the session (ADR-0016).
export const IDENTITY_UNAVAILABLE = 'identity service unavailable'

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

/** A request the server refused; message is its human-readable reason. */
export class ApiError extends Error {
  readonly status: number
  /** The raw response body. */
  readonly body: string
  constructor(message: string, status: number, body = '') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
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
 * resource")` in Firefox, and similar in Safari. The session's request
 * step re-throws the TypeError verbatim.
 */
export function looksLikeNetworkError(e: unknown): boolean {
  if (!(e instanceof Error)) return false
  if (e.name === 'TypeError') return true
  return /failed to fetch|network|connection (refused|reset)|unreachable|offline/i.test(
    e.message,
  )
}

/** True when the server was not reached or could not confirm the session. */
export function isTemporaryOutage(e: unknown): boolean {
  return e instanceof IdentityUnavailableError || looksLikeNetworkError(e)
}

/**
 * True when a commercial command's delivery failed in a way that says nothing
 * about the command itself (KMP ADR-0010): the server was not reached, could
 * not decide (5xx), or did not accept the session (401, 403). Keep it and
 * deliver it again later. Any other failure is the server refusing it.
 */
export function isTemporaryFailure(e: unknown): boolean {
  if (isTemporaryOutage(e)) return true
  if (e instanceof ApiError) return e.status === 401 || e.status === 403 || e.status >= 500
  return true
}

/**
 * The human-readable reason in an error body. pharmacy-api answers
 * {"error": "..."}, um-api answers {"message": "..."}.
 */
export function errorMessage(body: string, status: number): string {
  try {
    const parsed: unknown = JSON.parse(body)
    if (parsed && typeof parsed === 'object') {
      const { error, message } = parsed as { error?: unknown; message?: unknown }
      if (typeof error === 'string' && error) return error
      if (typeof message === 'string' && message) return message
    }
  } catch {
    // not JSON: fall through to the raw text
  }
  return body || `HTTP ${status}`
}
