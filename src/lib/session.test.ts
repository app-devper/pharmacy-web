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

function setup(seed: Record<string, string>, route: Route) {
  const store = memoryStorage(seed)
  const calls: string[] = []
  const heard: (SessionUser | null)[] = []
  const session = createSession({
    storage: () => store,
    fetch: async (url, init) => { calls.push(url); return route(url, init) },
    umBase: UM,
    now: () => NOW,
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
})
