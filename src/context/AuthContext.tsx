import { createContext, useContext, useState, useEffect, useCallback, Fragment } from 'react'
import type { ReactNode } from 'react'
import { session } from '../api/client'
import type { PasskeyLogin, SessionUser } from '../lib/session'

const KEEP_ALIVE_INTERVAL_MS = 10 * 60 * 1000

interface AuthContextValue {
  user: SessionUser | null
  loading: boolean
  login: (username: string, password: string, system: string) => Promise<void>
  loginWithPasskey: (system: string, login?: PasskeyLogin) => Promise<void>
  continueFromUm: (ticket: string, system: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** The React view of the session (lib/session); the session owns the rules. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => session.subscribe(setUser), [])

  useEffect(() => {
    let active = true
    session.resume().then((resumed) => {
      if (!active) return
      setUser(resumed)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!user) return
    const id = setInterval(() => {
      void session.keepAlive()
    }, KEEP_ALIVE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [user])

  const login = useCallback(async (username: string, password: string, system: string) => {
    await session.login(username, password, system)
  }, [])

  const loginWithPasskey = useCallback(async (system: string, login?: PasskeyLogin) => {
    await session.loginWithPasskey(system, login)
  }, [])

  const continueFromUm = useCallback(async (ticket: string, system: string) => {
    await session.continueFromUm(ticket, system)
  }, [])

  const logout = useCallback(() => session.logout(), [])

  const refreshUser = useCallback(async () => {
    await session.refreshUser()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithPasskey, continueFromUm, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Remounts its children whenever the signed-in user changes, so state they
 * hold in memory (the cart and its parked carts) cannot outlive a session.
 */
export function SessionScoped({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return <Fragment key={user?.id ?? 'signed-out'}>{children}</Fragment>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
