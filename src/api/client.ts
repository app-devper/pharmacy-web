import { browserPasskeys } from '../lib/passkey'
import { createSession } from '../lib/session'

export {
  ApiError,
  IdentityUnavailableError,
  isTemporaryFailure,
  isTemporaryOutage,
  looksLikeNetworkError,
} from './errors'

const API_BASE = import.meta.env.VITE_API_URL || ''
const UM_API = import.meta.env.VITE_UM_API_URL || 'http://localhost:8585'

/** The app's one session (lib/session): token, request step, sign-out rules. */
export const session = createSession({
  storage: () => localStorage,
  fetch: (url, init) => fetch(url, init),
  umBase: UM_API,
  passkeys: browserPasskeys,
})

/** A pharmacy-api request through the session. */
export const apiFetch = <T>(path: string, options?: RequestInit): Promise<T> =>
  session.request<T>(`${API_BASE}${path}`, options)

/** A um-api request through the session. */
export const umFetch = <T>(path: string, options?: RequestInit): Promise<T> =>
  session.request<T>(`${UM_API}${path}`, options)
