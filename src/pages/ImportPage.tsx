import { useState, useCallback } from 'react'
import { useToast } from '../hooks/useToast'
import { getImports, deleteImport, confirmImport } from '../api/imports'
import type { PurchaseOrderSummary } from '../types/import'
import ImportFormModal from '../components/imports/ImportFormModal'
import ImportDetailModal from '../components/imports/ImportDetailModal'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { useEffect } from 'react'
import { fmtDate, fmtMoney } from '../utils/formatters'

export default function ImportPage() {
  const showToast = useToast()
  const [orders, setOrders] = useState<PurchaseOrderSummary[]>([])
  const [loading, setLoading] = useState(true)

  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [viewId, setViewId] = useState<string | null>(null)

  const [search, setSearch] = useState('')

  const reload = useCallback(() => {
    setLoading(true)
    getImports()
      .then(setOrders)
      .catch(e => showToast((e as Error).message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { reload() }, [reload])

  const handleDelete = async (po: PurchaseOrderSummary) => {
    if (!window.confirm(`ลบใบนำเข้า ${po.doc_no} ?\nรายการนี้จะถูกลบถาวร`)) return
    try {
      await deleteImport(po.id)
      showToast('ลบสำเร็จ')
      reload()
    } catch (e) { showToast((e as Error).message, 'error') }
  }

  const handleConfirm = async (po: PurchaseOrderSummary) => {
    if (!window.confirm(
      `ยืนยันรับสินค้า ${po.doc_no} ?\n\nรายการ: ${po.item_count} รายการ\nมูลค่า: ${fmtMoney(po.total_cost)}\n\nระบบจะเพิ่มสต็อกอัตโนมัติ`
    )) return
    try {
      await confirmImport(po.id)
      showToast(`ยืนยันสำเร็จ — สต็อกเพิ่มแล้ว`)
      reload()
    } catch (e) { showToast((e as Error).message, 'error') }
  }

  const filtered = orders.filter(o => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      o.doc_no.toLowerCase().includes(q) ||
      o.supplier.toLowerCase().includes(q) ||
      o.invoice_no.toLowerCase().includes(q)
    )
  })

  const draftCount = orders.filter(o => o.status === 'draft').length

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-800">นำเข้าสินค้า</h1>
          <p className="text-xs text-gray-400 mt-0.5">จัดการใบนำเข้า / รับสินค้าเข้าสต็อก</p>
        </div>
        <div className="flex-1" />
        {draftCount > 0 && (
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
            {draftCount} แบบร่าง
          </span>
        )}
        <input
          type="text"
          placeholder="ค้นหาเลขที่ / ผู้ขาย..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-52 focus:outline-none focus:border-blue-400"
        />
        <Button onClick={() => setShowCreate(true)}>+ สร้างใบนำเข้า</Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-24"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-2">
            <span className="text-4xl">📥</span>
            <span className="text-sm">{search ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีใบนำเข้า'}</span>
            {!search && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >+ สร้างใบนำเข้าแรก</button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">เลขที่เอกสาร</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">ผู้ขาย</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">เลขที่ใบส่งของ</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">วันที่รับ</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 font-semibold">รายการ</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 font-semibold">มูลค่ารวม</th>
                  <th className="text-center py-3 px-4 text-xs text-gray-500 font-semibold">สถานะ</th>
                  <th className="py-3 px-4 text-xs text-gray-500 font-semibold w-48">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(po => (
                  <tr
                    key={po.id}
                    className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setViewId(po.id)}
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-gray-800">{po.doc_no}</td>
                    <td className="py-3 px-4 text-gray-700">{po.supplier || <span className="text-gray-300">—</span>}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{po.invoice_no || <span className="text-gray-300">—</span>}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{fmtDate(po.receive_date)}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{po.item_count}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-800">{fmtMoney(po.total_cost)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        po.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {po.status === 'confirmed' ? 'ยืนยันแล้ว' : 'แบบร่าง'}
                      </span>
                    </td>
                    <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setViewId(po.id)}
                          className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                        >
                          ดู
                        </button>
                        {po.status === 'draft' && (
                          <>
                            <button
                              onClick={() => setEditId(po.id)}
                              className="px-2.5 py-1 text-xs rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                            >
                              แก้ไข
                            </button>
                            <button
                              onClick={() => handleConfirm(po)}
                              className="px-2.5 py-1 text-xs rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition-colors"
                            >
                              ✓ ยืนยัน
                            </button>
                            <button
                              onClick={() => handleDelete(po)}
                              className="px-2.5 py-1 text-xs rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                            >
                              ลบ
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <ImportFormModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); reload() }}
        />
      )}
      {editId && (
        <ImportFormModal
          existingId={editId}
          onClose={() => setEditId(null)}
          onSaved={() => { setEditId(null); reload() }}
        />
      )}
      {viewId && (
        <ImportDetailModal
          importId={viewId}
          onClose={() => setViewId(null)}
        />
      )}
    </div>
  )
}
