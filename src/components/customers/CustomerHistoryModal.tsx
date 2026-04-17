import { useState, useEffect } from 'react'
import { getCustomerSales } from '../../api/customers'
import { useToast } from '../../hooks/useToast'
import { fmtDateThai, fmtMoney } from '../../utils/formatters'
import type { Customer } from '../../types/customer'
import type { Sale } from '../../types/sale'
import SaleDetailModal from '../sell/SaleDetailModal'
import Spinner from '../ui/Spinner'

interface Props {
  customer: Customer
  onClose: () => void
}

function daysSince(s: string | null): string {
  if (!s) return '—'
  const diff = Math.floor((Date.now() - new Date(s).getTime()) / 86400000)
  if (diff === 0) return 'วันนี้'
  if (diff === 1) return 'เมื่อวาน'
  return `${diff} วันที่แล้ว`
}

export default function CustomerHistoryModal({ customer, onClose }: Props) {
  const showToast = useToast()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [detailSale, setDetailSale] = useState<Sale | null>(null)

  useEffect(() => {
    getCustomerSales(customer.id)
      .then(setSales)
      .catch(e => showToast((e as Error).message, 'error'))
      .finally(() => setLoading(false))
  }, [customer.id])

  const hasAllergy = customer.disease && customer.disease !== '-' && customer.disease !== ''

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <div>
              <h2 className="text-base font-bold text-gray-800">{customer.name}</h2>
              {customer.phone && (
                <div className="text-xs text-gray-400 mt-0.5">📞 {customer.phone}</div>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4">×</button>
          </div>

          {/* Stats */}
          <div className="px-6 py-3 border-b border-gray-100 shrink-0">
            <div className="flex gap-3 flex-wrap">
              <div className="bg-emerald-50 rounded-xl px-4 py-2 text-center">
                <div className="text-base font-bold text-emerald-700">{fmtMoney(customer.total_spent)}</div>
                <div className="text-xs text-emerald-500">ยอดสะสม</div>
              </div>
              <div className="bg-blue-50 rounded-xl px-4 py-2 text-center">
                <div className="text-base font-bold text-blue-700">{sales.length}</div>
                <div className="text-xs text-blue-500">ครั้ง</div>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-2 text-center">
                <div className="text-base font-bold text-gray-700">{daysSince(customer.last_visit)}</div>
                <div className="text-xs text-gray-400">ล่าสุด</div>
              </div>
            </div>
            {hasAllergy && (
              <div className="mt-2.5 flex gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-sm text-amber-700">
                <span className="shrink-0">⚠</span>
                <span>{customer.disease}</span>
              </div>
            )}
          </div>

          {/* Sales list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : sales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                <span className="text-3xl">🧾</span>
                <span className="text-sm">ยังไม่มีประวัติการซื้อ</span>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-2.5 px-6 text-xs text-gray-500 font-semibold">เลขที่บิล</th>
                    <th className="text-left py-2.5 px-3 text-xs text-gray-500 font-semibold">วันที่</th>
                    <th className="text-right py-2.5 px-6 text-xs text-gray-500 font-semibold">ยอดรวม</th>
                    <th className="py-2.5 px-4 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(sale => (
                    <tr key={sale.id} className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setDetailSale(sale)}>
                      <td className="py-3 px-6 font-mono font-semibold text-gray-800">{sale.bill_no}</td>
                      <td className="py-3 px-3 text-gray-500 text-xs">{fmtDateThai(sale.sold_at)}</td>
                      <td className="py-3 px-6 text-right font-medium text-gray-800">{fmtMoney(sale.total)}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={e => { e.stopPropagation(); setDetailSale(sale) }}
                          className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 transition-colors"
                        >
                          ดู
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-100 flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 transition-colors"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>

      {/* Nested sale detail */}
      {detailSale && (
        <SaleDetailModal sale={detailSale} onClose={() => setDetailSale(null)} />
      )}
    </>
  )
}
