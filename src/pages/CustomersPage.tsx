import { useState, useEffect, useCallback } from 'react'
import type { Customer } from '../types/customer'
import { getCustomers } from '../api/customers'
import { useToast } from '../hooks/useToast'
import CustomerTable from '../components/customers/CustomerTable'
import AddCustomerModal from '../components/customers/AddCustomerModal'
import CustomerHistoryModal from '../components/customers/CustomerHistoryModal'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null)
  const showToast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try { setCustomers(await getCustomers()) }
    catch (e: unknown) { showToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <span className="font-semibold text-gray-700">ลูกค้าทั้งหมด ({customers.length})</span>
          <input
            type="text"
            placeholder="ค้นหาชื่อ / เบอร์โทร..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
          <Button onClick={() => setShowAdd(true)}>+ เพิ่มลูกค้า</Button>
        </div>
        {loading
          ? <div className="py-12 flex justify-center"><Spinner /></div>
          : <CustomerTable customers={filtered} onSelect={setHistoryCustomer} />
        }
      </div>

      {showAdd && (
        <AddCustomerModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load() }}
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
