import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import type { Settings } from '../types/setting'
import { defaultSettings } from '../types/setting'
import { getSettings } from '../api/settings'
import { useAuth } from './AuthContext'
import { setAppTimezone } from '../utils/date'

interface SettingsContextValue {
  settings: Settings
  loading: boolean
  /** Replace entire cache — used by SettingsPage after PUT succeeds. */
  setSettings: (s: Settings) => void
  /** Force a re-fetch from backend. */
  reload: () => Promise<void>
}

const Ctx = createContext<SettingsContextValue | null>(null)

/**
 * App-wide settings cache (store info + receipt layout). Loaded once after
 * login and exposed via useSettings() to ReceiptModal, printReceipt, etc.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [settings, setSettingsState] = useState<Settings>(defaultSettings)
  const [loading, setLoading] = useState(false)

  // Wrapping setSettings lets us keep the date helpers' active timezone in sync
  // whenever the cache is refreshed (via reload) or replaced (via SettingsPage
  // save). Without this the app would boot with the default TZ and never pick
  // up a user-configured value.
  const setSettings = useCallback((s: Settings) => {
    setSettingsState(s)
    setAppTimezone(s.timezone)
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSettings()
      setSettings(data)
    } catch {
      // Keep defaults; UI stays functional even when /api/settings fails
    } finally {
      setLoading(false)
    }
  }, [setSettings])

  useEffect(() => {
    if (!user) return
    reload()
  }, [user, reload])

  return (
    <Ctx.Provider value={{ settings, loading, setSettings, reload }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
