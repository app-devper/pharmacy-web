import { useState, useEffect, useCallback } from 'react'
import { useOnlineStatus } from './useOnlineStatus'
import { useToast } from './useToast'
import { useDrugs } from '../context/DrugsContext'
import {
  getPendingSales,
  removePendingSale,
  markSaleError,
} from '../lib/offlineQueue'
import { _createSaleRaw } from '../api/sales'

/**
 * useOfflineSync
 *
 * - Tracks the number of pending (offline-queued) sales + how many have
 *   previously failed to sync (items with a `.error` tag)
 * - Auto-syncs when the browser comes back online
 * - After a successful sync, triggers a drug re-fetch so any optimistic
 *   offline stock patches get replaced by authoritative server values
 * - Exposes { pending, failed, syncing, sync } for the UI
 */
export function useOfflineSync() {
  const online    = useOnlineStatus()
  const showToast = useToast()
  const { reload: reloadDrugs } = useDrugs()
  const [pending, setPending] = useState(0)
  const [failed, setFailed]   = useState(0)
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(async () => {
    const queue = await getPendingSales()
    setPending(queue.length)
    setFailed(queue.filter(q => q.error).length)
  }, [])

  // Count pending on mount
  useEffect(() => { refresh() }, [refresh])

  const sync = useCallback(async () => {
    const queue = await getPendingSales()
    if (queue.length === 0) return

    setSyncing(true)
    let ok = 0, fail = 0

    for (const item of queue) {
      try {
        await _createSaleRaw(item.data)   // direct API — bypass offline wrapper
        await removePendingSale(item.id)
        ok++
      } catch (e) {
        await markSaleError(item.id, (e as Error).message)
        fail++
      }
    }

    setSyncing(false)
    await refresh()
    // Re-fetch drugs so any optimistic offline-stock patches get replaced
    // by authoritative server values (accounts for lot deductions that
    // happened elsewhere while this client was offline).
    if (ok > 0) reloadDrugs()

    if (ok)   showToast(`ซิงค์สำเร็จ ${ok} รายการ`, 'success')
    if (fail) showToast(`ซิงค์ไม่สำเร็จ ${fail} รายการ — ตรวจสอบรายการที่ค้างซิงค์`, 'error')
  }, [refresh, reloadDrugs, showToast])

  // Auto-sync as soon as we come back online
  useEffect(() => {
    if (online) sync()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  return { pending, failed, syncing, sync, refresh }
}
