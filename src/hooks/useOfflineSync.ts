import { useState, useEffect, useCallback } from 'react'
import { useOnlineStatus } from './useOnlineStatus'
import { useToast } from './useToast'
import {
  getPendingSales,
  removePendingSale,
  markSaleError,
  pendingCount,
} from '../lib/offlineQueue'
import { _createSaleRaw } from '../api/sales'

/**
 * useOfflineSync
 *
 * - Tracks the number of pending (offline-queued) sales
 * - Auto-syncs when the browser comes back online
 * - Exposes { pending, syncing, sync } for the UI
 */
export function useOfflineSync() {
  const online    = useOnlineStatus()
  const showToast = useToast()
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(async () => {
    setPending(await pendingCount())
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

    if (ok)   showToast(`ซิงค์สำเร็จ ${ok} รายการ`, 'success')
    if (fail) showToast(`ซิงค์ไม่สำเร็จ ${fail} รายการ — ตรวจสอบรายการที่ค้างซิงค์`, 'error')
  }, [refresh, showToast])

  // Auto-sync as soon as we come back online
  useEffect(() => {
    if (online) sync()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  return { pending, syncing, sync, refresh }
}
