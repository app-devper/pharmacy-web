import { useState, useEffect, useCallback } from 'react'
import { getSuppliers, deleteSupplier } from '../api/suppliers'
import { useToast } from '../hooks/useToast'
import type { Supplier } from '../types/supplier'
import SupplierFormModal from '../components/suppliers/SupplierFormModal'
import SupplierDetailModal from '../components/suppliers/SupplierDetailModal'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

export default function SuppliersPage() {
  const showToast = useToast()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')

  const [showAdd, setShowAdd]           = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getSuppliers()
      .then(setSuppliers)
      .catch(e => showToast((e as Error).message, 'error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (s: Supplier) => {
    if (!window.confirm(`ลบซัพพลายเออร์ "${s.name}" ?\nรายการนี้จะถูกลบถาวร`)) return
    try {
      await deleteSupplier(s.id)
      showToast('ลบซัพพลายเออร์สำเร็จ')
      load()
    } catch (e) { showToast((e as Error).message, 'error') }
  }

  const filtered = suppliers.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      s.contact_name.toLowerCase().includes(q) ||
      s.phone.includes(q)
    )
  })

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-800">ซัพพลายเออร์</h1>
          <p className="text-xs text-gray-400 mt-0.5">จัดการข้อมูลผู้ขายและบริษัทคู่ค้า</p>
        </div>
        <div className="flex-1" />
        <input
          type="text"
          placeholder="ค้นหาชื่อ / ผู้ติดต่อ / เบอร์โทร..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-60 focus:outline-none focus:border-blue-400"
        />
        <Button onClick={() => setShowAdd(true)}>+ เพิ่มซัพพลายเออร์</Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-24"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-2">
            <span className="text-4xl">🏭</span>
            <span className="text-sm">{search ? 'ไม่พบซัพพลายเออร์ที่ค้นหา' : 'ยังไม่มีซัพพลายเออร์'}</span>
            {!search && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >+ เพิ่มซัพพลายเออร์รายแรก</button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">ชื่อบริษัท / ร้านค้า</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">ผู้ติดต่อ</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">เบอร์โทร</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">เลขผู้เสียภาษี</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">หมายเหตุ</th>
                  <th className="py-3 px-4 text-xs text-gray-500 font-semibold w-44">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr
                    key={s.id}
                    className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setDetailSupplier(s)}
                  >
                    <td className="py-3 px-4 font-medium text-gray-800">{s.name}</td>
                    <td className="py-3 px-4 text-gray-600">{s.contact_name || <span className="text-gray-300">—</span>}</td>
                    <td className="py-3 px-4 text-gray-600">{s.phone || <span className="text-gray-300">—</span>}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs font-mono">{s.tax_id || <span className="text-gray-300">—</span>}</td>
                    <td className="py-3 px-4 text-gray-400 text-xs max-w-[160px] truncate">{s.notes || <span className="text-gray-300">—</span>}</td>
                    <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setDetailSupplier(s)}
                          className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                        >ประวัติ</button>
                        <button
                          onClick={() => setEditSupplier(s)}
                          className="px-2.5 py-1 text-xs rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                        >แก้ไข</button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="px-2.5 py-1 text-xs rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                        >ลบ</button>
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
      {showAdd && (
        <SupplierFormModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load() }}
        />
      )}
      {editSupplier && (
        <SupplierFormModal
          supplier={editSupplier}
          onClose={() => setEditSupplier(null)}
          onSaved={() => { setEditSupplier(null); load() }}
        />
      )}
      {detailSupplier && (
        <SupplierDetailModal
          supplier={detailSupplier}
          onClose={() => setDetailSupplier(null)}
        />
      )}
    </div>
  )
}
