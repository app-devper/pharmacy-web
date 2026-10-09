import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import type { Drug } from '../types/drug'
import type { StockUpdate } from '../types/sale'
import { getDrugs } from '../api/drugs'
import { useAuth } from './AuthContext'

interface DrugsContextValue {
  drugs: Drug[]
  loading: boolean
  /**
   * Tell the cache that stock changed. With `updates` (a confirmed sale's
   * stock, or the estimate for a pending one) the list is patched in place;
   * without, it is fetched again from pharmacy-api, which owns stock
   * (KMP ADR-0003). Every view that shows stock follows `stockVersion`.
   */
  stockChanged: (updates?: StockUpdate[]) => void
  /** Bumped on every stockChanged; views that read stock elsewhere (lots, expiry) refresh on it. */
  stockVersion: number
}

const Ctx = createContext<DrugsContextValue | null>(null)

/**
 * App-wide drug cache. Loads once after authentication and is shared by
 * SellPage, StockPage, ImportFormModal, KyDrugSelect, etc. so navigating
 * between pages does NOT trigger a re-fetch.
 *
 * Every command that changes stock (sale, void, return, goods receipt,
 * count, adjustment, drug add/edit/import, pending-sale sync) ends with
 * `stockChanged`, which decides between a patch and a re-fetch and lets the
 * dependent views (expiry alert) know.
 */
export function DrugsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [drugs, setDrugs] = useState<Drug[]>([])
  const [loading, setLoading] = useState(false)
  const [stockVersion, setStockVersion] = useState(0)

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

  const stockChanged = useCallback((updates?: StockUpdate[]) => {
    if (updates && updates.length > 0) patchStocks(updates)
    else reload()
    setStockVersion(v => v + 1)
  }, [patchStocks, reload])

  return (
    <Ctx.Provider value={{ drugs, loading, stockChanged, stockVersion }}>
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
