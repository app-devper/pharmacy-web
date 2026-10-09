import { useState } from 'react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'
import { useOfflineSync } from '../hooks/useOfflineSync'
import { useToast } from '../hooks/useToast'
import { can } from '../lib/access'
import { abandon, discardDamaged, exportEntry, retry, type PendingEntry } from '../lib/pendingSales'

function saleTotal(item: PendingEntry) {
  if (item.state === 'damaged') return 0
  const subtotal = item.data.items.reduce((sum, saleItem) => sum + saleItem.price * saleItem.qty, 0)
  return Math.max(0, subtotal - (item.data.discount ?? 0))
}

const STATUS: Record<PendingEntry['state'], { label: string; className: string }> = {
  pending:    { label: 'รอซิงค์',       className: 'bg-amber-100 text-amber-700' },
  conflict:   { label: 'ถูกปฏิเสธ',     className: 'bg-red-100 text-red-700' },
  ky_pending: { label: 'ขย. ค้าง',      className: 'bg-purple-100 text-purple-700' },
  damaged:    { label: 'ข้อมูลเสียหาย', className: 'bg-gray-200 text-gray-700' },
}

type Resolving =
  | { kind: 'abandon'; entry: PendingEntry; reason: string }
  | { kind: 'discard'; entry: PendingEntry }

export default function OfflineSyncPage() {
  const showToast = useToast()
  const { user } = useAuth()
  const canResolve = can(user?.role, 'resolve_pending_sale')
  const { entries, pending, needsAction, sync, syncing, refresh } = useOfflineSync()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [exported, setExported] = useState<Set<string>>(new Set())
  const [resolving, setResolving] = useState<Resolving | null>(null)
  const [working, setWorking] = useState(false)

  const busy = syncing || busyId !== null || working

  const handleRetry = async (item: PendingEntry) => {
    setBusyId(item.id)
    try {
      const state = await retry(item.id)
      if (state === null) showToast('ส่งบิลเข้าระบบแล้ว', 'success')
      else showToast('บิลยังส่งไม่ผ่าน ดูเหตุผลที่รายการ', 'error')
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const handleExport = async (item: PendingEntry) => {
    try {
      await exportEntry(item.id)
      setExported(prev => new Set(prev).add(item.id))
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  const confirmResolving = async () => {
    if (!resolving) return
    setWorking(true)
    try {
      if (resolving.kind === 'abandon') {
        await abandon(resolving.entry.id, resolving.reason)
        showToast('บันทึกการยกเลิกแล้ว', 'success')
      } else {
        await discardDamaged(resolving.entry.id)
        showToast('ลบข้อมูลที่เสียหายแล้ว', 'success')
      }
      setResolving(null)
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setWorking(false)
    }
  }

  const kyOnly = resolving?.entry.state === 'ky_pending'

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-800">รายการค้างซิงค์</h1>
          <p className="text-xs text-gray-400 mt-0.5">ตรวจสอบบิล offline ที่ยังไม่ได้ส่งเข้า backend</p>
        </div>
        <div className="flex-1" />
        <Button variant="secondary" onClick={refresh}>รีเฟรช</Button>
        <Button onClick={sync} disabled={busy || pending === 0}>
          {syncing ? 'กำลังซิงค์…' : 'ลองซิงค์ทั้งหมด'}
        </Button>
      </div>

      <div className="p-6 space-y-4 overflow-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-800">{pending}</div>
            <div className="text-xs text-gray-400">รอซิงค์ (ส่งซ้ำอัตโนมัติ)</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-2xl font-bold text-red-600">{needsAction}</div>
            <div className="text-xs text-gray-400">ต้องจัดการ (ไม่ส่งซ้ำอัตโนมัติ)</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-800">
              ฿{entries.reduce((sum, item) => sum + saleTotal(item), 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-400">มูลค่ารวม</div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-gray-500">เวลา</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-500">รหัส queue / บิล</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-500">รายการ</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-500">ยอดรวม</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-500">สถานะ</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-500">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">ไม่มีรายการค้างซิงค์</td>
                </tr>
              )}
              {entries.map(item => (
                <tr key={item.id} className="border-b border-gray-50 align-top">
                  <td className="px-4 py-3 text-gray-600">
                    {item.created_at ? new Date(item.created_at).toLocaleString('th-TH') : '-'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {item.id}
                    {item.state !== 'damaged' && item.bill_no && <div className="text-gray-700">บิล {item.bill_no}</div>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {item.state === 'damaged' ? '-' : item.data.items.length}
                    {item.state !== 'damaged' && item.ky?.length ? <div className="text-xs text-purple-600">ขย. {item.ky.length} รายการ</div> : null}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">฿{saleTotal(item).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS[item.state].className}`}>
                      {busyId === item.id ? 'กำลังส่ง…' : STATUS[item.state].label}
                    </span>
                    {item.state === 'damaged' ? (
                      <div className="text-xs text-gray-500 mt-1 max-w-md">อ่านข้อมูลบิลนี้ไม่ได้ ให้ส่งออกไฟล์เก็บไว้ก่อน</div>
                    ) : item.error ? (
                      <div className="text-xs text-red-500 mt-1 max-w-md break-words">{item.error}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2 flex-wrap">
                      {item.state !== 'damaged' && (
                        <Button variant="secondary" disabled={busy} onClick={() => handleRetry(item)}>ลองส่งใหม่</Button>
                      )}
                      {item.state !== 'damaged' && canResolve && (
                        <Button variant="danger" disabled={busy} onClick={() => setResolving({ kind: 'abandon', entry: item, reason: '' })}>
                          {item.state === 'ky_pending' ? 'ปิดเรื่อง ขย.' : 'ยกเลิกบิล'}
                        </Button>
                      )}
                      <Button variant="ghost" disabled={busy} onClick={() => handleExport(item)}>ส่งออกไฟล์</Button>
                      {item.state === 'damaged' && canResolve && (
                        <Button
                          variant="danger"
                          disabled={busy || !exported.has(item.id)}
                          title={exported.has(item.id) ? undefined : 'ส่งออกไฟล์ก่อนจึงลบได้'}
                          onClick={() => setResolving({ kind: 'discard', entry: item })}
                        >
                          ลบ
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {resolving && (
        <Modal
          title={resolving.kind === 'discard' ? 'ลบข้อมูลที่เสียหาย?' : kyOnly ? 'ปิดเรื่อง ขย. ที่ค้าง?' : 'ยกเลิกบิลที่ค้าง?'}
          onClose={() => { if (!working) setResolving(null) }}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {resolving.kind === 'discard'
                ? 'ข้อมูลที่อ่านไม่ได้นี้จะถูกลบออกจากเครื่อง (ส่งออกไฟล์เก็บไว้แล้ว)'
                : kyOnly
                  ? 'ขย. ที่ถูกปฏิเสธจะไม่ถูกบันทึก ระบบจะเก็บแบบฟอร์มกับเหตุผลไว้ตรวจสอบย้อนหลัง'
                  : 'บิลนี้จะไม่ถูกบันทึกเป็นยอดขาย ระบบจะเก็บข้อมูลบิลกับเหตุผลไว้ตรวจสอบย้อนหลัง'}
            </p>
            {resolving.kind === 'abandon' && (
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                rows={3}
                placeholder="เหตุผล (จำเป็น)"
                value={resolving.reason}
                disabled={working}
                onChange={e => setResolving({ ...resolving, reason: e.target.value })}
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" disabled={working} onClick={() => setResolving(null)}>ยกเลิก</Button>
              <Button
                variant="danger"
                disabled={working || (resolving.kind === 'abandon' && !resolving.reason.trim())}
                onClick={confirmResolving}
              >
                {working ? 'กำลังบันทึก…' : resolving.kind === 'discard' ? 'ลบ' : kyOnly ? 'ปิดเรื่อง ขย.' : 'ยกเลิกบิล'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
