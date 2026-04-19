import { useState, useEffect } from 'react'
import type { Ky9 } from '../types/kyforms'
import { getKy9 } from '../api/kyforms'
import { useToast } from '../hooks/useToast'
import KyFormHeader from '../components/kyforms/KyFormHeader'
import KyToolbar from '../components/kyforms/KyToolbar'
import KyTable from '../components/kyforms/KyTable'
import AddKy9Modal from '../components/kyforms/AddKy9Modal'
import Spinner from '../components/ui/Spinner'
import { exportKy9Xlsx } from '../utils/exportXlsx'
import { monthBangkok } from '../utils/date'

const columns = [
  { key: 'date', label: 'วันที่' },
  { key: 'drug_name', label: 'ชื่อยา' },
  { key: 'reg_no', label: 'ทะเบียนยา' },
  { key: 'unit', label: 'หน่วย' },
  { key: 'qty', label: 'จำนวน', align: 'right' as const },
  { key: 'price_per_unit', label: 'ราคา/หน่วย', align: 'right' as const, render: (r: Ky9) => `฿${r.price_per_unit.toLocaleString()}` },
  { key: 'total_value', label: 'มูลค่า', align: 'right' as const, render: (r: Ky9) => `฿${r.total_value.toLocaleString()}` },
  { key: 'seller', label: 'ผู้ขาย/บริษัท' },
  { key: 'invoice_no', label: 'เลขใบส่งของ' },
]

export default function Ky9Page() {
  const [entries, setEntries] = useState<Ky9[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => monthBangkok())
  const [showAdd, setShowAdd] = useState(false)
  const showToast = useToast()

  const load = async () => {
    setLoading(true)
    try { setEntries(await getKy9(month)) }
    catch (e: unknown) { showToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [month])

  const totalValue = entries.reduce((s, e) => s + e.total_value, 0)

  return (
    <div className="p-6">
      <KyFormHeader title="ขย.9 — บัญชีการซื้อยา" subtitle="บัญชีแสดงรายการซื้อยาและผลิตภัณฑ์สุขภาพ" color="bg-blue-600" />
      <KyToolbar
        month={month}
        onMonthChange={setMonth}
        onAdd={() => setShowAdd(true)}
        onExportXlsx={() => exportKy9Xlsx(entries, month)}
      />
      {loading ? <Spinner /> : (
        <KyTable columns={columns} rows={entries} footerRow={{ total_value: `฿${totalValue.toLocaleString()}` }} />
      )}
      {showAdd && <AddKy9Modal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
    </div>
  )
}
