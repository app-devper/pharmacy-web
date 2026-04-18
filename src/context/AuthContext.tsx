import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'

const UM_API = import.meta.env.VITE_UM_API_URL || 'http://localhost:8585'

interface User {
  id: string
  firstName: string
  lastName: string
  username: string
  role: string
  system: string
  phone: string
  email: string
}

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (username: string, password: string, system: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return Date.now() >= payload.exp * 1000
  } catch {
    return true
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => {
    const t = localStorage.getItem('token')
    if (!t || isTokenExpired(t)) {
      if (t) localStorage.removeItem('token')
      return null
    }
    return t
  })
  const [loading, setLoading] = useState(true)

  const clearAuth = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
  }, [])

  const fetchUserInfo = useCallback(async (tk: string) => {
    try {
      const res = await fetch(`${UM_API}/api/um/v1/user/info`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      if (!res.ok) throw new Error('unauthorized')
      const data = await res.json()
      setUser(data)
    } catch {
      clearAuth()
    }
  }, [clearAuth])

  const keepAlive = useCallback(async (tk: string): Promise<string | null> => {
    try {
      const res = await fetch(`${UM_API}/api/um/v1/auth/keep-alive`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      if (!res.ok) return null
      const data = await res.json()
      if (data.accessToken) {
        setToken(data.accessToken)
        localStorage.setItem('token', data.accessToken)
        return data.accessToken
      }
      return tk
    } catch {
      return null
    }
  }, [])

  // On mount: validate existing token
  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    (async () => {
      const refreshed = await keepAlive(token)
      if (refreshed) {
        await fetchUserInfo(refreshed)
      } else {
        clearAuth()
      }
      setLoading(false)
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep-alive interval (every 10 minutes)
  useEffect(() => {
    if (!token) return
    const id = setInterval(() => {
      keepAlive(token)
    }, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [token, keepAlive])

  const login = useCallback(async (username: string, password: string, system: string) => {
    const res = await fetch(`${UM_API}/api/um/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, system }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Login failed' }))
      throw new Error(err.message || 'Login failed')
    }
    const data = await res.json()
    const tk = data.accessToken as string
    setToken(tk)
    localStorage.setItem('token', tk)
    await fetchUserInfo(tk)
  }, [fetchUserInfo])

  const logout = useCallback(async () => {
    if (token) {
      await fetch(`${UM_API}/api/um/v1/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    clearAuth()
  }, [token, clearAuth])

  const refreshUser = useCallback(async () => {
    if (token) await fetchUserInfo(token)
  }, [token, fetchUserInfo])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
