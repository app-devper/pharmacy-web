import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

interface Toast {
  message: string
  type: 'success' | 'error' | 'info'
  visible: boolean
}

interface AppContextValue {
  toast: Toast
  showToast: (message: string, type?: Toast['type']) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast>({ message: '', type: 'success', visible: false })

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    setToast({ message, type, visible: true })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000)
  }, [])

  return (
    <AppContext.Provider value={{ toast, showToast }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
