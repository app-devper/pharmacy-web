import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { useOfflineSync } from '../../hooks/useOfflineSync'

/**
 * NetworkStatus — shown in the Topbar.
 *
 * States:
 *  • Online, nothing pending  → renders nothing (null)
 *  • Offline                  → red pill "ออฟไลน์"
 *  • Online + pending sales   → amber pill "รอซิงค์ N รายการ" / "กำลังซิงค์..."
 */
export default function NetworkStatus() {
  const online             = useOnlineStatus()
  const { pending, syncing } = useOfflineSync()

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
