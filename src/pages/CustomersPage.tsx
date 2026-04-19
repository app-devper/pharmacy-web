import { useState, useEffect, useCallback } from 'react'
import type { Customer } from '../types/customer'
import { getCustomers } from '../api/customers'
import { useToast } from '../hooks/useToast'
import AddCustomerModal from '../components/customers/AddCustomerModal'
import EditCustomerModal from '../components/customers/EditCustomerModal'
import CustomerHistoryModal from '../components/customers/CustomerHistoryModal'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { useIsAdmin } from '../hooks/useIsAdmin'

export default function CustomersPage() {
  const showToast = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')

  const isAdmin = useIsAdmin()
  const [showAdd, setShowAdd]               = useState(false)
  const [editCustomer, setEditCustomer]     = useState<Customer | null>(null)
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setCustomers(await getCustomers()) }
    catch (e: unknown) { showToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = customers.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.phone.includes(q)
  })

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-800">ลูกค้า</h1>
          <p className="text-xs text-gray-400 mt-0.5">จัดการข้อมูลลูกค้าและประวัติการซื้อ</p>
        </div>
        <div className="flex-1" />
        <input
          type="text"
          placeholder="ค้นหาชื่อ / เบอร์โทร…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-60 focus:outline-none focus:border-blue-400"
        />
        <Button onClick={() => setShowAdd(true)}>+ เพิ่มลูกค้า</Button>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-24"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-2">
            <span className="text-4xl">👥</span>
            <span className="text-sm">{search ? 'ไม่พบลูกค้าที่ค้นหา' : 'ยังไม่มีลูกค้า'}</span>
            {!search && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >+ เพิ่มลูกค้ารายแรก</button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">ชื่อ</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">เบอร์โทร</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">โรคประจำตัว / แพ้ยา</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 font-semibold">ยอดซื้อรวม</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-500 font-semibold">มาล่าสุด</th>
                  <th className="py-3 px-4 text-xs text-gray-500 font-semibold w-36">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setHistoryCustomer(c)}
                  >
                    <td className="py-3 px-4 font-medium text-gray-800">{c.name}</td>
                    <td className="py-3 px-4 text-gray-600">{c.phone || <span className="text-gray-300">—</span>}</td>
                    <td className="py-3 px-4 text-xs max-w-[200px] truncate">
                      {c.disease && c.disease !== '-'
                        ? <span className="text-amber-600">{c.disease}</span>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                      ฿{c.total_spent.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-xs">
                      {c.last_visit
                        ? new Date(c.last_visit).toLocaleDateString('th-TH')
                        : '—'}
                    </td>
                    <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setHistoryCustomer(c)}
                          className="px-2.5 py-1 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                        >ประวัติ</button>
                        {isAdmin && (
                          <button
                            onClick={() => setEditCustomer(c)}
                            className="px-2.5 py-1 text-xs rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                          >แก้ไข</button>
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

      {/* ── Modals ── */}
      {showAdd && (
        <AddCustomerModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load() }}
        />
      )}
      {editCustomer && (
        <EditCustomerModal
          customer={editCustomer}
          onClose={() => setEditCustomer(null)}
          onSaved={() => { setEditCustomer(null); load() }}
        />
      )}
      {historyCustomer && (
        <CustomerHistoryModal
          customer={historyCustomer}
          onClose={() => setHistoryCustomer(null)}
        />
      )}
    </div>
  )
}
