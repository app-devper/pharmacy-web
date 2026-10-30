import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { createToaster, type Toast, type ToastType } from '../lib/toast'

interface AppContextValue {
  toast: Toast
  showToast: (message: string, type?: ToastType) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast>({ message: '', type: 'success', visible: false })
  const [toaster] = useState(() => createToaster(setToast))

  return (
    <AppContext.Provider value={{ toast, showToast: toaster.show }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
