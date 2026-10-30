import { describe, expect, it } from 'vitest'
import { ApiError, IdentityUnavailableError, isTemporaryFailure } from '../api/errors'
import { createSession, type SessionUser } from './session'

const UM = 'http://um'
const NOW = 1_800_000_000_000

const jwt = (expMs: number) => `h.${btoa(JSON.stringify({ exp: expMs / 1000 }))}.s`
const LIVE = jwt(NOW + 3_600_000)
const DEAD = jwt(NOW - 1)

const cashier: SessionUser = {
  id: 'u1', firstName: 'Somchai', lastName: 'J', username: 'somchai',
  role: 'USER', system: 'PHARMACY', phone: '', email: '',
}

function memoryStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed))
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

type Route = (url: string, init?: RequestInit) => Response | Promise<Response>
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const offline: Route = () => { throw new TypeError('Failed to fetch') }

function setup(seed: Record<string, string>, route: Route, passkey: (options: unknown, request?: unknown) => Promise<unknown> = async () => ({ id: 'cred' })) {
  const store = memoryStorage(seed)
  const calls: string[] = []
  const heard: (SessionUser | null)[] = []
  const session = createSession({
    storage: () => store,
    fetch: async (url, init) => { calls.push(url); return route(url, init) },
    umBase: UM,
    now: () => NOW,
    passkeys: { get: passkey },
  })
  session.subscribe((u) => heard.push(u))
  return { store, calls, heard, session }
}

const signedIn = { token: LIVE, 'pharmacy.sessionUser': JSON.stringify(cashier), 'pharmacy.parkedCarts': '{"slots":[]}' }

describe('session', () => {
  it('keeps the cashier signed in when the POS reloads offline', async () => {
    const { session, store } = setup(signedIn, offline)
    expect(await session.resume()).toEqual(cashier)
    expect(store.data.get('token')).toBe(LIVE)
    expect(store.data.has('pharmacy.parkedCarts')).toBe(true)
  })

  it('keeps the cashier signed in when um-api answers 5xx on reload', async () => {
    const { session } = setup(signedIn, () => json({ message: 'down' }, 502))
    expect(await session.resume()).toEqual(cashier)
  })

  it('ends the session and scrubs parked carts when um-api refuses it', async () => {
    const { session, store, heard } = setup(signedIn, () => json({ message: 'revoked' }, 401))
    expect(await session.resume()).toBeNull()
    expect([...store.data.keys()]).toEqual([])
    expect(heard).toEqual([null])
  })

  it('scrubs an expired token on reload without calling the network', async () => {
    const { session, store, calls } = setup({ ...signedIn, token: DEAD }, offline)
    expect(await session.resume()).toBeNull()
    expect(store.data.size).toBe(0)
    expect(calls).toEqual([])
  })

  it('refreshes the token and the user when um-api confirms the session', async () => {
    const fresh = jwt(NOW + 7_200_000)
    const { session, store } = setup(signedIn, (url) =>
      url.endsWith('/keep-alive') ? json({ accessToken: fresh }) : json({ ...cashier, firstName: 'New' }))
    expect((await session.resume())?.firstName).toBe('New')
    expect(store.data.get('token')).toBe(fresh)
  })

  it('a 401 from pharmacy-api ends the session, scrubs parked carts, and stays retryable', async () => {
    const { session, store, heard } = setup(signedIn, () => new Response('', { status: 401 }))
    const failure = await session.request('/api/pharmacy/v1/sales', { method: 'POST' }).catch((e) => e)
    expect(failure).toBeInstanceOf(ApiError)
    expect((failure as ApiError).status).toBe(401)
    expect(isTemporaryFailure(failure)).toBe(true)
    expect(store.data.has('pharmacy.parkedCarts')).toBe(false)
    expect(store.data.has('token')).toBe(false)
    expect(heard).toEqual([null])
  })

  it('a 401 for a token that was already replaced does not end the new session', async () => {
    const store = memoryStorage(signedIn)
    const next = jwt(NOW + 9_000_000)
    const session = createSession({
      storage: () => store,
      fetch: async () => { store.setItem('token', next); return new Response('', { status: 401 }) },
      umBase: UM,
      now: () => NOW,
    })
    await session.request('/x').catch(() => {})
    expect(store.data.get('token')).toBe(next)
    expect(store.data.has('pharmacy.parkedCarts')).toBe(true)
  })

  it('identity 503 is temporary and keeps the session', async () => {
    const { session, store } = setup(signedIn, () => new Response('identity service unavailable', { status: 503 }))
    await expect(session.request('/x')).rejects.toBeInstanceOf(IdentityUnavailableError)
    expect(store.data.get('token')).toBe(LIVE)
  })

  it('reads um-api and pharmacy-api refusal messages alike', async () => {
    const um = setup(signedIn, () => json({ message: 'ชื่อผู้ใช้ซ้ำ' }, 409))
    await expect(um.session.request(`${UM}/api/um/v1/user`)).rejects.toThrow('ชื่อผู้ใช้ซ้ำ')
    const api = setup(signedIn, () => json({ error: 'stock ไม่พอ' }, 422))
    await expect(api.session.request('/api/pharmacy/v1/sales')).rejects.toThrow('stock ไม่พอ')
  })

  it('signs in, remembers the user, and tells subscribers', async () => {
    const { session, store, heard } = setup({}, (url) =>
      url.endsWith('/login') ? json({ accessToken: LIVE }) : json(cashier))
    expect(await session.login('somchai', 'pw', 'PHARMACY')).toEqual(cashier)
    expect(store.data.get('token')).toBe(LIVE)
    expect(heard).toEqual([cashier])
  })

  it('a wrong password is a refusal with um-api\'s message and leaves nothing behind', async () => {
    const { session, store, heard } = setup({}, () => json({ message: 'รหัสผ่านไม่ถูกต้อง' }, 401))
    await expect(session.login('somchai', 'bad', 'PHARMACY')).rejects.toThrow('รหัสผ่านไม่ถูกต้อง')
    expect(store.data.size).toBe(0)
    expect(heard).toEqual([])
  })

  it('signs out even when um-api cannot be reached', async () => {
    const { session, store, heard } = setup(signedIn, offline)
    await session.logout()
    expect(store.data.size).toBe(0)
    expect(heard).toEqual([null])
  })

  describe('passkey login', () => {
    const options = { ceremonyId: 'c1', options: { publicKey: { challenge: 'x' } } }

    it('answers the ceremony UM issued for the system and signs in', async () => {
      const bodies: Record<string, unknown> = {}
      const seen: unknown[] = []
      const { session, store } = setup({}, (url, init) => {
        if (init?.body) bodies[url] = JSON.parse(String(init.body))
        if (url.endsWith('/auth/passkey/login/options')) return json(options)
        if (url.endsWith('/auth/passkey/login')) return json({ accessToken: LIVE })
        return json(cashier)
      }, async (o) => { seen.push(o); return { id: 'cred' } })
      expect(await session.loginWithPasskey('PHARMACY')).toEqual(cashier)
      expect(bodies[`${UM}/api/um/v1/auth/passkey/login/options`]).toEqual({ system: 'PHARMACY' })
      expect(seen).toEqual([options])
      expect(bodies[`${UM}/api/um/v1/auth/passkey/login`]).toEqual({ ceremonyId: 'c1', credential: { id: 'cred' } })
      expect(store.data.get('token')).toBe(LIVE)
    })

    it('sends the username typed when the passkey answers, and the request to the authenticator', async () => {
      const bodies: Record<string, unknown> = {}
      const requests: unknown[] = []
      const { session } = setup({}, (url, init) => {
        if (init?.body) bodies[url] = JSON.parse(String(init.body))
        if (url.endsWith('/auth/passkey/login/options')) return json(options)
        if (url.endsWith('/auth/passkey/login')) return json({ accessToken: LIVE })
        return json(cashier)
      }, async (_o, request) => { requests.push(request); return { id: 'cred' } })
      let typed = ''
      const login = session.loginWithPasskey('PHARMACY', { conditional: true, typedUsername: () => typed })
      typed = ' somchai '
      expect(await login).toEqual(cashier)
      expect(requests).toEqual([{ conditional: true, typedUsername: expect.any(Function) }])
      expect(bodies[`${UM}/api/um/v1/auth/passkey/login`]).toEqual({ ceremonyId: 'c1', credential: { id: 'cred' }, username: 'somchai' })
    })

    it('keeps nobody signed in when the prompt is dismissed', async () => {
      const { session, store, calls } = setup({}, () => json(options), async () => { throw new DOMException('dismissed', 'NotAllowedError') })
      await expect(session.loginWithPasskey('PHARMACY')).rejects.toThrow()
      expect(store.data.has('token')).toBe(false)
      expect(calls.some((c) => c.endsWith('/auth/passkey/login'))).toBe(false)
    })

    it('surfaces a rejected passkey as an ApiError without a token', async () => {
      const { session, store } = setup({}, (url) =>
        url.endsWith('/options') ? json(options) : json({ code: 'UM-401-005', message: 'passkey not accepted' }, 401))
      await expect(session.loginWithPasskey('PHARMACY')).rejects.toBeInstanceOf(ApiError)
      expect(store.data.has('token')).toBe(false)
    })
  })

  describe('continueFromUm', () => {
    const bodies: Record<string, unknown> = {}
    const route = (system: string): Route => (url, init) => {
      if (init?.body) bodies[url] = JSON.parse(String(init.body))
      if (url.endsWith('/auth/exchange')) return json({ accessToken: LIVE })
      if (url.endsWith('/auth/verify')) return json({ system })
      return json(cashier)
    }

    it('starts the session from the ticket UM handed over', async () => {
      const { session, store } = setup({}, route('PHARMACY'))
      expect(await session.continueFromUm('t-1', 'PHARMACY')).toEqual(cashier)
      expect(bodies[`${UM}/api/um/v1/auth/exchange`]).toEqual({ ticket: 't-1' })
      expect(store.data.get('token')).toBe(LIVE)
    })

    it('refuses a ticket for another system and keeps nobody signed in', async () => {
      const { session, store } = setup({}, route('PORT'))
      await expect(session.continueFromUm('t-1', 'PHARMACY')).rejects.toThrow()
      expect(store.data.has('token')).toBe(false)
    })

    it('surfaces an expired ticket as an ApiError without a token', async () => {
      const { session, store } = setup({}, () => json({ code: 'UM-401-002', message: 'ticket invalid or expired' }, 401))
      await expect(session.continueFromUm('old', 'PHARMACY')).rejects.toBeInstanceOf(ApiError)
      expect(store.data.has('token')).toBe(false)
    })

    it('ends the session already in this browser before using the ticket', async () => {
      const { session, store, heard } = setup(signedIn, () => json({ code: 'UM-401-002', message: 'ticket invalid or expired' }, 401))
      await expect(session.continueFromUm('old', 'PHARMACY')).rejects.toBeInstanceOf(ApiError)
      expect(store.data.has('token')).toBe(false)
      expect(store.data.has('pharmacy.parkedCarts')).toBe(false)
      expect(heard).toEqual([null])
    })
  })
})

