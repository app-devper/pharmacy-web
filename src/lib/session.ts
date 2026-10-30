import {
  ApiError,
  IDENTITY_UNAVAILABLE,
  IdentityUnavailableError,
  errorMessage,
} from '../api/errors'

/** The signed-in user as um-api describes them. */
export interface SessionUser {
  id: string
  firstName: string
  lastName: string
  username: string
  role: string
  system: string
  phone: string
  email: string
}

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type Fetch = (url: string, init?: RequestInit) => Promise<Response>
type Listener = (user: SessionUser | null) => void

export interface SessionDeps {
  /** Where the token and user-scoped data live (localStorage in the app). */
  storage: () => KeyValueStore
  fetch: Fetch
  /** um-api base URL. */
  umBase: string
  now?: () => number
  /** Runs a passkey login ceremony (navigator.credentials.get in the app). */
  passkeys?: PasskeyCeremony
}

/** How to ask for a passkey: in the browser's modal prompt, or offered in the username field (conditional). */
export interface PasskeyRequest {
  conditional?: boolean
  signal?: AbortSignal
}

/** A passkey login: how to prompt, and the username typed on the form when the passkey answers. */
export interface PasskeyLogin extends PasskeyRequest {
  /** Read when the passkey answers; UM refuses a passkey that belongs to a different account. */
  typedUsername?: () => string
}

/** Answers UM's passkey login options with the authenticator's assertion as JSON. */
export interface PasskeyCeremony {
  get(options: unknown, request?: PasskeyRequest): Promise<unknown>
}

/** How um-api answered a session check. */
export type SessionCheck = 'confirmed' | 'refused' | 'unreachable'

const TOKEN_KEY = 'token'
const USER_KEY = 'pharmacy.sessionUser'

/**
 * Client storage that belongs to the signed-in user and is scrubbed when the
 * session ends, so a different cashier on the same device starts clean.
 *
 * Kept on purpose: 'pharmacy:prefs' (per-browser UI preferences); the
 * IndexedDB offline sale queue (those sales must still sync, and the server
 * dedupes on client_request_id); the Workbox runtime caches.
 */
const USER_SCOPED_KEYS = [TOKEN_KEY, USER_KEY, 'pharmacy.parkedCarts']

const SESSION_EXPIRED = 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'

function tokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: unknown }
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

/**
 * The session module: owns the token, the request step every API call goes
 * through (pharmacy-api and um-api alike), and what each answer means.
 *
 * - A 401 for the current token ends the session: the token and user-scoped
 *   storage are scrubbed and subscribers hear `null`. The caller gets an
 *   `ApiError(401)`, which a queued sale treats as "keep and retry".
 * - um-api being unreachable (offline, 5xx) is not a refusal: the cashier
 *   stays signed in with the last confirmed user, so the POS works offline.
 */
export function createSession({ storage, fetch, umBase, now = Date.now, passkeys }: SessionDeps) {
  const listeners = new Set<Listener>()
  const notify = (user: SessionUser | null) => listeners.forEach((l) => l(user))

  const storedToken = () => storage().getItem(TOKEN_KEY)

  /** The stored token while it has not expired. */
  function token(): string | null {
    const t = storedToken()
    if (!t) return null
    const expiry = tokenExpiry(t)
    return expiry !== null && now() < expiry ? t : null
  }

  function cachedUser(): SessionUser | null {
    try {
      const raw = storage().getItem(USER_KEY)
      return raw ? (JSON.parse(raw) as SessionUser) : null
    } catch {
      return null
    }
  }

  function remember(user: SessionUser): SessionUser {
    storage().setItem(USER_KEY, JSON.stringify(user))
    notify(user)
    return user
  }

  /** Ends the session on this device and scrubs user-scoped storage. */
  function end() {
    const store = storage()
    USER_SCOPED_KEYS.forEach((k) => store.removeItem(k))
    notify(null)
  }

  /** Sends a request; `auth: false` is for signing in. */
  async function request<T>(url: string, options: RequestInit = {}, { auth = true } = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }
    const sent = auth ? storedToken() : null
    if (sent) headers['Authorization'] = `Bearer ${sent}`

    const res = await fetch(url, { ...options, headers })

    if (res.status === 401 && auth) {
      if (sent === storedToken()) end()
      throw new ApiError(SESSION_EXPIRED, 401)
    }
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      if (res.status === 503 && text.includes(IDENTITY_UNAVAILABLE)) {
        throw new IdentityUnavailableError()
      }
      throw new ApiError(errorMessage(text, res.status), res.status, text)
    }
    const text = await res.text()
    return (text ? JSON.parse(text) : undefined) as T
  }

  /** Was the failure um-api refusing the session, or not reaching it? */
  function checkOf(e: unknown): SessionCheck {
    if (e instanceof ApiError && e.status < 500) return 'refused'
    return 'unreachable'
  }

  /** Asks um-api to extend the session; a refusal ends it. */
  async function keepAlive(): Promise<SessionCheck> {
    if (!token()) return 'refused'
    try {
      const data = await request<{ accessToken?: string } | undefined>(`${umBase}/api/um/v1/auth/keep-alive`)
      if (data?.accessToken) storage().setItem(TOKEN_KEY, data.accessToken)
      return 'confirmed'
    } catch (e) {
      const check = checkOf(e)
      if (check === 'refused' && storedToken()) end()
      return check
    }
  }

  /** Reloads the user from um-api; unreachable keeps the last confirmed one. */
  async function refreshUser(): Promise<SessionUser | null> {
    try {
      return remember(await request<SessionUser>(`${umBase}/api/um/v1/user/info`))
    } catch (e) {
      if (checkOf(e) === 'unreachable') return cachedUser()
      if (storedToken()) end()
      return null
    }
  }

  async function begin(accessToken: string): Promise<SessionUser> {
    storage().setItem(TOKEN_KEY, accessToken)
    try {
      return remember(await request<SessionUser>(`${umBase}/api/um/v1/user/info`))
    } catch (e) {
      end()
      throw e
    }
  }

  return {
    token,
    cachedUser,
    request,
    keepAlive,
    refreshUser,
    end,

    /** Picks the session up after a reload. Works offline with a valid token. */
    async resume(): Promise<SessionUser | null> {
      if (!token()) {
        if (storedToken() || cachedUser()) end()
        return null
      }
      const check = await keepAlive()
      if (check === 'refused') return null
      return check === 'confirmed' ? refreshUser() : cachedUser()
    },

    async login(username: string, password: string, system: string): Promise<SessionUser> {
      const data = await request<{ accessToken: string }>(
        `${umBase}/api/um/v1/auth/login`,
        { method: 'POST', body: JSON.stringify({ username, password, system }) },
        { auth: false },
      )
      return begin(data.accessToken)
    },

    /** Signs in with a passkey on the system; UM applies the same rules as a password login. */
    async loginWithPasskey(system: string, login: PasskeyLogin = {}): Promise<SessionUser> {
      if (!passkeys) throw new Error('passkeys are not available')
      const options = await request<{ ceremonyId: string }>(
        `${umBase}/api/um/v1/auth/passkey/login/options`,
        { method: 'POST', body: JSON.stringify({ system }) },
        { auth: false },
      )
      const credential = await passkeys.get(options, login)
      const username = login.typedUsername?.().trim()
      const data = await request<{ accessToken: string }>(
        `${umBase}/api/um/v1/auth/passkey/login`,
        { method: 'POST', body: JSON.stringify({ ceremonyId: options.ceremonyId, credential, ...(username ? { username } : {}) }) },
        { auth: false },
      )
      return begin(data.accessToken)
    },

    /**
     * Signs in with the one-time ticket UM handed over when the user opened
     * this app from UM (um-api ADR-0011); a ticket for another system is refused.
     * The ticket decides who is signed in, so any earlier session here ends first.
     */
    async continueFromUm(ticket: string, system: string): Promise<SessionUser> {
      if (storedToken() || cachedUser()) end()
      const data = await request<{ accessToken: string }>(
        `${umBase}/api/um/v1/auth/exchange`,
        { method: 'POST', body: JSON.stringify({ ticket }) },
        { auth: false },
      )
      storage().setItem(TOKEN_KEY, data.accessToken)
      try {
        const principal = await request<{ system: string }>(`${umBase}/api/um/v1/auth/verify`)
        if (principal.system !== system) throw new Error(`ticket is for ${principal.system}, not ${system}`)
      } catch (e) {
        end()
        throw e
      }
      return begin(data.accessToken)
    },

    async logout(): Promise<void> {
      if (storedToken()) {
        await request(`${umBase}/api/um/v1/auth/logout`, { method: 'POST' }).catch(() => {})
      }
      end()
    },

    /** Hears every change of signed-in user; `null` means the session ended. */
    subscribe(listener: Listener): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export type Session = ReturnType<typeof createSession>
