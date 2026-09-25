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
import { IdentityUnavailableError, isTemporaryOutage } from '../api/client'

/**
 * useOfflineSync
 *
 * - Tracks the number of pending (offline-queued) sales + how many have
 *   previously failed to sync (items with a `.error` tag)
 * - Auto-syncs when the browser comes back online
 * - After a successful sync, triggers a drug re-fetch so any optimistic
 *   offline stock patches get replaced by authoritative server values
 * - Exposes { pending, failed, syncing, sync } for the UI
 *
 * Sync semantics:
 *   - Loop walks queued sales one at a time, calling _createSaleRaw
 *     (direct API; no offline fallback)
 *   - On success → removePendingSale + `ok++`
 *   - On a sale-specific failure (4xx/5xx, validation error) →
 *     markSaleError + `fail++` and continue to the next sale
 *   - On a temporary outage (network failure, or the server cannot
 *     confirm the session) → break the loop entirely; tell the user once,
 *     and leave the remaining sales untouched so they're picked up on the
 *     next sync()
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
    let ok = 0
    let fail = 0
    let aborted: 'network' | 'identity' | null = null

    for (const item of queue) {
      try {
        await _createSaleRaw({
          ...item.data,
          client_request_id: item.data.client_request_id || item.id,
        })   // direct API — bypass offline wrapper
        await removePendingSale(item.id)
        ok++
      } catch (e) {
        if (isTemporaryOutage(e)) {
          // Connection is down, or the server can't confirm the session
          // right now — none of the remaining sales will get through.
          // Stop; the next sync() (auto-fired when connectivity returns,
          // or manual) retries from where we left off.
          aborted = e instanceof IdentityUnavailableError ? 'identity' : 'network'
          break
        }
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
    if (aborted === 'network') showToast('เครือข่ายขัดข้อง — ระบบจะลองซิงค์อีกครั้งเมื่อกลับมาออนไลน์', 'info')
    if (aborted === 'identity') showToast('ยืนยันตัวตนไม่ได้ชั่วคราว — รายการยังค้างซิงค์ กรุณากดซิงค์อีกครั้งภายหลัง', 'info')
  }, [refresh, reloadDrugs, showToast])

  // Auto-sync as soon as we come back online
  useEffect(() => {
    if (online) sync()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  return { pending, failed, syncing, sync, refresh }
}
