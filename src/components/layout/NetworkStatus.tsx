import { Link } from 'react-router-dom'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useOfflineSync } from '../../hooks/useOfflineSync'

/**
 * NetworkStatus — shown in the Topbar.
 *
 * States:
 *  • Online, queue empty      → renders nothing (null)
 *  • Offline                  → red pill "ออฟไลน์"
 *  • Online + pending sync    → amber pill "รอซิงค์ N" / "กำลังซิงค์..."
 *  • Needs a person (refused, KY pending, damaged) → red pill linking to
 *    the pending sales page; these are never retried automatically.
 */
export default function NetworkStatus() {
  const online                           = useOnlineStatus()
  const { pending, needsAction, syncing } = useOfflineSync()

  // Fully normal — show nothing
  if (online && pending === 0 && needsAction === 0) return null

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

  if (needsAction > 0 && !syncing) {
    return (
      <Link
        to="/offline-sync"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 border border-red-200 text-red-700 text-xs font-medium select-none hover:bg-red-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
        title={`${needsAction} รายการต้องจัดการ — ไม่ส่งซ้ำอัตโนมัติ`}
      >
        <span aria-hidden="true">⚠</span>
        ต้องจัดการ {needsAction}
      </Link>
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
