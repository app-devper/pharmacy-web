import { useState, useEffect, useCallback } from 'react'
import { useOnlineStatus } from './useOnlineStatus'
import { useToast } from './useToast'
import { useDrugs } from '../context/DrugsContext'
import { listPendingSales, onPendingSalesChange, syncAll, type PendingEntry } from '../lib/pendingSales'

/**
 * useOfflineSync — pending sales for the UI (lib/pendingSales owns the rules).
 *
 * - `entries`: every pending sale in this browser, oldest first
 * - `pending`: waiting only for the server; synced automatically when the
 *   browser comes back online
 * - `needsAction`: refused, KY pending, or damaged; never retried
 *   automatically
 * - After a sync records anything, drugs are re-fetched so optimistic offline
 *   stock patches give way to server values.
 */
export function useOfflineSync() {
  const online    = useOnlineStatus()
  const showToast = useToast()
  const { stockChanged } = useDrugs()
  const [entries, setEntries] = useState<PendingEntry[]>([])
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(async () => {
    setEntries(await listPendingSales())
  }, [])

  useEffect(() => {
    refresh()
    return onPendingSalesChange(() => { refresh() })
  }, [refresh])

  const sync = useCallback(async () => {
    if ((await listPendingSales()).every(e => e.state !== 'pending')) return
    setSyncing(true)
    try {
      const { recorded, refused, outage } = await syncAll()
      if (recorded > 0) stockChanged()
      if (recorded) showToast(`ซิงค์สำเร็จ ${recorded} รายการ`, 'success')
      if (refused)  showToast(`server ไม่รับ ${refused} รายการ — ตรวจสอบที่หน้ารายการค้างซิงค์`, 'error')
      if (outage === 'network')  showToast('เครือข่ายขัดข้อง — ระบบจะลองซิงค์อีกครั้งเมื่อกลับมาออนไลน์', 'info')
      if (outage === 'identity') showToast('ยืนยันตัวตนไม่ได้ชั่วคราว — รายการยังค้างซิงค์ กรุณากดซิงค์อีกครั้งภายหลัง', 'info')
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setSyncing(false)
    }
  }, [stockChanged, showToast])

  // Auto-sync as soon as we come back online
  useEffect(() => {
    if (online) sync()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  const pending = entries.filter(e => e.state === 'pending').length
  const needsAction = entries.length - pending
  return { entries, pending, needsAction, syncing, sync, refresh }
}
