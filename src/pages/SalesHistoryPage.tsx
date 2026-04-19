import { useState, useEffect } from 'react'
import type { Sale } from '../types/sale'
import { getSales } from '../api/sales'
import { useToast } from '../hooks/useToast'
import { fmtDateTime } from '../utils/formatters'
import SaleDetailModal from '../components/sell/SaleDetailModal'
import Spinner from '../components/ui/Spinner'
import { useDrugs } from '../hooks/useDrugs'
import { todayBangkok } from '../utils/date'

export default function SalesHistoryPage() {
  const today = todayBangkok()
  const [from, setFrom] = useState(today)
  const [to,   setTo]   = useState(today)
  const [q,    setQ]    = useState('')
  const [sales, setSales]   = useState<Sale[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Sale | null>(null)
  const showToast = useToast()
  const { reload: reloadDrugs } = useDrugs()

  const load = async () => {
    setLoading(true)
    try {
      const data = await getSales({ from, to, q: q.trim() || undefined, limit: 500 })
      setSales(data)
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Load on mount with today's date
  useEffect(() => { load() }, [])

  const totalSales = sales.filter(s => !s.voided).reduce((sum, s) => sum + s.total, 0)
  const voidedCount = sales.filter(s => s.voided).length

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">จาก</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">ถึง</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1">ค้นหา</label>
            <input
              type="text"
              placeholder="เลขบิล หรือ ชื่อลูกค้า…"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
          <button
            onClick={load}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            ค้นหา
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {!loading && sales.length > 0 && (
        <div className="flex gap-4 mb-3 text-sm text-gray-600">
          <span><span className="font-semibold text-gray-800">{sales.length}</span> รายการ</span>
          <span>ยอดรวม <span className="font-semibold text-blue-600">฿{totalSales.toLocaleString()}</span></span>
          {voidedCount > 0 && (
            <span className="text-red-500"><span className="font-semibold">{voidedCount}</span> ยกเลิก</span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <Spinner />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">เลขบิล</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">วันที่ / เวลา</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">ลูกค้า</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">ยอดสุทธิ</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-gray-400 py-12">ไม่พบรายการ</td>
                </tr>
              ) : (
                sales.map(sale => (
                  <tr
                    key={sale.id}
                    onClick={() => setSelected(sale)}
                    className={`border-t border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${sale.voided ? 'opacity-60' : ''}`}
                  >
                    <td className="px-5 py-3 font-mono text-gray-800 font-medium">{sale.bill_no}</td>
                    <td className="px-4 py-3 text-gray-500">{fmtDateTime(sale.sold_at)}</td>
                    <td className="px-4 py-3 text-gray-600">{sale.customer_name || <span className="text-gray-300">—</span>}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${sale.voided ? 'text-gray-400 line-through' : 'text-blue-600'}`}>
                      ฿{sale.total.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {sale.voided ? (
                        <span className="inline-block px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full">ยกเลิก</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">สำเร็จ</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <SaleDetailModal
          sale={selected}
          onClose={() => setSelected(null)}
          onSaleChanged={() => {
            // Void/return restores stock on the backend → invalidate shared drug cache
            // so SellPage/StockPage don't show stale numbers.
            setSelected(null)
            load()
            reloadDrugs()
          }}
        />
      )}
    </div>
  )
}
