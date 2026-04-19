import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useOfflineSync } from '../../hooks/useOfflineSync'

/**
 * NetworkStatus — shown in the Topbar.
 *
 * States:
 *  • Online, queue empty      → renders nothing (null)
 *  • Offline                  → red pill "ออฟไลน์"
 *  • Online + pending sync    → amber pill "รอซิงค์ N" / "กำลังซิงค์..."
 *  • Failed sync (persistent) → red pill "ซิงค์ล้มเหลว N · กดเพื่อลอง" —
 *    stays visible until the user clicks to retry or clears them manually.
 *    Unlike the other states this is clickable to force a sync.
 */
export default function NetworkStatus() {
  const online                           = useOnlineStatus()
  const { pending, failed, syncing, sync } = useOfflineSync()

  // Fully normal — show nothing
  if (online && pending === 0) return null

  if (!online) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 border border-red-200 text-red-700 text-xs font-medium select-none"
        title="ไม่มีการเชื่อมต่ออินเตอร์เน็ต"
      >
        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
        ออฟไลน์
      </div>
    )
  }

  // Back online but some queued sales failed to replay — show a persistent
  // red pill that the user can click to retry. Takes priority over the plain
  // amber "pending" state.
  if (failed > 0 && !syncing) {
    return (
      <button
        type="button"
        onClick={() => sync()}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 border border-red-200 text-red-700 text-xs font-medium select-none hover:bg-red-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
        title={`${failed} รายการซิงค์ไม่สำเร็จ — กดเพื่อลองส่งใหม่`}
      >
        <span aria-hidden="true">⚠</span>
        ซิงค์ล้มเหลว {failed}
      </button>
    )
  }

  // Back online, flushing queue
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-700 text-xs font-medium select-none"
      title={syncing ? 'กำลังส่งข้อมูลที่ค้างไว้' : `มี ${pending} รายการรอส่ง`}
    >
      <span
        className={`w-2 h-2 rounded-full bg-amber-500 shrink-0 ${syncing ? 'animate-ping' : ''}`}
      />
      {syncing ? 'กำลังซิงค์…' : `รอซิงค์ ${pending} รายการ`}
    </div>
  )
}
