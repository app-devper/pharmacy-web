import { useState, useEffect } from 'react'
import { getImportsBySupplier } from '../../api/imports'
import { useToast } from '../../hooks/useToast'
import type { Supplier } from '../../types/supplier'
import type { PurchaseOrderSummary } from '../../types/import'
import Spinner from '../ui/Spinner'
import { fmtDate, fmtMoney } from '../../utils/formatters'

interface Props {
  supplier: Supplier
  onClose: () => void
}

export default function SupplierDetailModal({ supplier, onClose }: Props) {
  const showToast = useToast()
  const [orders, setOrders]   = useState<PurchaseOrderSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    getImportsBySupplier(supplier.name)
      .then(data  => { if (mounted) setOrders(data) })
      .catch(e    => { if (mounted) showToast((e as Error).message, 'error') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [supplier.name, showToast])

  const totalCost = orders.reduce((s, o) => s + o.total_cost, 0)
  const confirmedCount = orders.filter(o => o.status === 'confirmed').length

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-800">{supplier.name}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
              {supplier.contact_name && <span>👤 {supplier.contact_name}</span>}
              {supplier.phone        && <span>📞 {supplier.phone}</span>}
              {supplier.tax_id       && <span>🔢 {supplier.tax_id}</span>}
              {supplier.address      && <span>📍 {supplier.address}</span>}
            </div>
            {supplier.notes && (
              <div className="mt-1 text-xs text-gray-400 italic">{supplier.notes}</div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4">×</button>
        </div>

        {/* Summary bar */}
        {!loading && orders.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex gap-6 text-sm shrink-0">
            <div>
              <span className="text-gray-500">ใบนำเข้าทั้งหมด </span>
              <span className="font-semibold text-gray-800">{orders.length} ใบ</span>
            </div>
            <div>
              <span className="text-gray-500">ยืนยันแล้ว </span>
              <span className="font-semibold text-green-700">{confirmedCount} ใบ</span>
            </div>
            <div>
              <span className="text-gray-500">มูลค่ารวม </span>
              <span className="font-semibold text-gray-800">{fmtMoney(totalCost)}</span>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Spinner /></div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <span className="text-3xl">📥</span>
              <span className="text-sm">ยังไม่มีใบนำเข้าจากซัพพลายเออร์นี้</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="text-left pb-2 text-xs text-gray-500 font-semibold">เลขที่เอกสาร</th>
                  <th className="text-left pb-2 text-xs text-gray-500 font-semibold">เลขใบส่งของ</th>
                  <th className="text-left pb-2 text-xs text-gray-500 font-semibold">วันที่รับ</th>
                  <th className="text-right pb-2 text-xs text-gray-500 font-semibold">รายการ</th>
                  <th className="text-right pb-2 text-xs text-gray-500 font-semibold">มูลค่า</th>
                  <th className="text-center pb-2 text-xs text-gray-500 font-semibold">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(po => (
                  <tr key={po.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 font-mono text-xs font-semibold text-gray-800">{po.doc_no}</td>
                    <td className="py-2.5 text-xs text-gray-500">{po.invoice_no || '—'}</td>
                    <td className="py-2.5 text-xs text-gray-500">{fmtDate(po.receive_date as unknown as string)}</td>
                    <td className="py-2.5 text-right text-gray-700">{po.item_count}</td>
                    <td className="py-2.5 text-right font-medium text-gray-800">{fmtMoney(po.total_cost)}</td>
                    <td className="py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        po.status === 'confirmed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {po.status === 'confirmed' ? 'ยืนยันแล้ว' : 'แบบร่าง'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
