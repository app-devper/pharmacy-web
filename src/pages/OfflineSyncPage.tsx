import { useCallback, useEffect, useMemo, useState } from 'react'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { useOfflineSync } from '../hooks/useOfflineSync'
import { useToast } from '../hooks/useToast'
import { getPendingSales, removePendingSale, type PendingSale } from '../lib/offlineQueue'

function saleTotal(item: PendingSale) {
  const subtotal = item.data.items.reduce((sum, saleItem) => sum + saleItem.price * saleItem.qty, 0)
  return Math.max(0, subtotal - (item.data.discount ?? 0))
}

export default function OfflineSyncPage() {
  const showToast = useToast()
  const { sync, syncing } = useOfflineSync()
  const [items, setItems] = useState<PendingSale[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const queue = await getPendingSales()
      setItems(queue.sort((a, b) => a.created_at - b.created_at))
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const failed = useMemo(() => items.filter(item => item.error), [items])
  const pending = items.length

  const handleRetry = async () => {
    await sync()
    await load()
  }

  const handleCancel = async (item: PendingSale) => {
    if (!window.confirm(`ยกเลิกบิลค้างซิงค์ ${item.id}? รายการนี้จะไม่ถูกส่งเข้า backend`)) return
    await removePendingSale(item.id)
    showToast('ยกเลิกรายการค้างซิงค์แล้ว', 'success')
    await load()
  }

  if (loading) return <Spinner />

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-800">รายการค้างซิงค์</h1>
          <p className="text-xs text-gray-400 mt-0.5">ตรวจสอบบิล offline ที่ยังไม่ได้ส่งเข้า backend</p>
        </div>
        <div className="flex-1" />
        <Button variant="secondary" onClick={load}>รีเฟรช</Button>
        <Button onClick={handleRetry} disabled={syncing || pending === 0}>
          {syncing ? 'กำลังซิงค์…' : 'ลองซิงค์ทั้งหมด'}
        </Button>
      </div>

      <div className="p-6 space-y-4 overflow-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-800">{pending}</div>
            <div className="text-xs text-gray-400">รายการค้างทั้งหมด</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-2xl font-bold text-red-600">{failed.length}</div>
            <div className="text-xs text-gray-400">ซิงค์ล้มเหลว</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-800">
              ฿{items.reduce((sum, item) => sum + saleTotal(item), 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-400">มูลค่ารวม</div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-gray-500">เวลา</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-500">รหัส queue</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-500">รายการ</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-500">ยอดรวม</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-500">สถานะ</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-500">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">ไม่มีรายการค้างซิงค์</td>
                </tr>
              )}
              {items.map(item => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(item.created_at).toLocaleString('th-TH')}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.id}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{item.data.items.length}</td>
                  <td className="px-4 py-3 text-right tabular-nums">฿{saleTotal(item).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {item.error ? (
                      <div>
                        <span className="inline-flex px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-medium">ล้มเหลว</span>
                        <div className="text-xs text-red-500 mt-1 max-w-md break-words">{item.error}</div>
                      </div>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-medium">รอซิงค์</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="secondary" onClick={() => handleCancel(item)}>ยกเลิก</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
