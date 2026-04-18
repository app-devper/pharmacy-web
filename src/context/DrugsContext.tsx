import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import type { Drug } from '../types/drug'
import type { StockUpdate } from '../types/sale'
import { getDrugs } from '../api/drugs'
import { useAuth } from './AuthContext'

interface DrugsContextValue {
  drugs: Drug[]
  loading: boolean
  /** Force a full re-fetch from backend. */
  reload: () => Promise<void>
  /** Patch local stock values without a re-fetch. Use after a sale. */
  patchStocks: (updates: StockUpdate[]) => void
}

const Ctx = createContext<DrugsContextValue | null>(null)

/**
 * App-wide drug cache. Loads once after authentication and is shared by
 * SellPage, StockPage, ImportFormModal, KyDrugSelect, etc. so navigating
 * between pages does NOT trigger a re-fetch.
 *
 * Invalidation:
 *  - `reload()` — after drug add/update/import/adjust
 *  - `patchStocks(updates)` — after a sale (uses SaleResponse.stock_updates)
 */
export function DrugsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getDrugs()
      setDrugs(data)
    } catch {
      // Keep previous state; UI continues to show stale data
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch after the user logs in; clear when they log out
  useEffect(() => {
    if (!user) {
      setDrugs([])
      return
    }
    reload()
  }, [user, reload])

  const patchStocks = useCallback((updates: StockUpdate[]) => {
    if (!updates || updates.length === 0) return
    setDrugs(prev => {
      const byId = new Map(updates.map(u => [u.drug_id, u.new_stock]))
      let changed = false
      const next = prev.map(d => {
        if (byId.has(d.id)) {
          changed = true
          return { ...d, stock: byId.get(d.id)! }
        }
        return d
      })
      return changed ? next : prev
    })
  }, [])

  return (
    <Ctx.Provider value={{ drugs, loading, reload, patchStocks }}>
      {children}
    </Ctx.Provider>
  )
}

/** Access the shared drug cache. Must be inside <DrugsProvider>. */
export function useDrugs(): DrugsContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDrugs must be used within DrugsProvider')
  return ctx
}
