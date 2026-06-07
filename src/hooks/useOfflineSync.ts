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
 * `looksLikeNetworkError` — best-effort detection that the catch
 * block caught a network failure (dropped wifi, captive portal,
 * server unreachable) rather than a sale-specific 4xx/5xx the
 * backend deliberately returned.
 *
 * Browser fetch surfaces these as `TypeError("Failed to fetch")` in
 * Chromium/Edge, `TypeError("NetworkError when attempting to fetch
 * resource")` in Firefox, and similar in Safari. apiFetch() re-throws
 * the TypeError verbatim.
 *
 * Whenever this is true we abort the sync loop instead of marking
 * every remaining sale as failed — the connection is broken, none of
 * them ever reached the server, and stamping `.error` on each one
 * would (a) burn IDB writes, (b) make the UI scream "9 ซิงค์ไม่สำเร็จ"
 * when really only one network blip happened, and (c) trigger a
 * second round of replay attempts the moment the user manually
 * presses Retry.
 */
function looksLikeNetworkError(e: unknown): boolean {
  if (!(e instanceof Error)) return false
  if (e.name === 'TypeError') return true
  return /failed to fetch|network|connection (refused|reset)|unreachable|offline/i.test(
    e.message,
  )
}

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
 *   - On a network failure → break the loop entirely; tell the user
 *     once that the network blipped, and leave the remaining sales
 *     untouched so they're picked up on the next sync()
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
    let aborted = false

    for (const item of queue) {
      try {
        await _createSaleRaw({
          ...item.data,
          client_request_id: item.data.client_request_id || item.id,
        })   // direct API — bypass offline wrapper
        await removePendingSale(item.id)
        ok++
      } catch (e) {
        if (looksLikeNetworkError(e)) {
          // Connection is down — none of the remaining sales reached
          // the server. Stop hammering the dead network; the next
          // sync() (auto-fired by the online effect when connectivity
          // returns, or manual) will retry from where we left off.
          aborted = true
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
    if (aborted) showToast('เครือข่ายขัดข้อง — ระบบจะลองซิงค์อีกครั้งเมื่อกลับมาออนไลน์', 'info')
  }, [refresh, reloadDrugs, showToast])

  // Auto-sync as soon as we come back online
  useEffect(() => {
    if (online) sync()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  return { pending, failed, syncing, sync, refresh }
}
