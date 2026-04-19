import { useState, useEffect } from 'react'
import type { Ky12 } from '../types/kyforms'
import { getKy12, addKy12 } from '../api/kyforms'
import { useToast } from '../hooks/useToast'
import KyFormHeader from '../components/kyforms/KyFormHeader'
import KyToolbar from '../components/kyforms/KyToolbar'
import KyTable from '../components/kyforms/KyTable'
import KyDrugSelect from '../components/kyforms/KyDrugSelect'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { DRUG_UNITS } from '../types/drug'
import { exportKy12Xlsx } from '../utils/exportXlsx'
import { todayBangkok, monthBangkok } from '../utils/date'

const columns = [
  { key: 'date', label: 'วันที่' },
  { key: 'rx_no', label: 'เลขใบสั่ง' },
  { key: 'patient_name', label: 'ชื่อผู้ป่วย' },
  { key: 'doctor', label: 'แพทย์' },
  { key: 'hospital', label: 'สถานพยาบาล' },
  { key: 'drug_name', label: 'รายการยา' },
  { key: 'qty', label: 'จำนวน', align: 'right' as const },
  { key: 'unit', label: 'หน่วย' },
  { key: 'total_value', label: 'มูลค่า', align: 'right' as const, render: (r: Ky12) => `฿${r.total_value.toLocaleString()}` },
  { key: 'status', label: 'สถานะ' },
]

const empty = {
  date: todayBangkok(),
  rx_no: '', patient_name: '', doctor: '', hospital: '',
  drug_name: '', qty: '', unit: 'เม็ด', total_value: '', status: 'จ่ายแล้ว',
}

export default function Ky12Page() {
  const [entries, setEntries] = useState<Ky12[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => monthBangkok())
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  const load = async () => {
    setLoading(true)
    try { setEntries(await getKy12(month)) }
    catch (e: unknown) { showToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [month])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.rx_no || !form.patient_name || !form.drug_name) {
      showToast('กรุณากรอกข้อมูลให้ครบ', 'error'); return
    }
    setSaving(true)
    try {
      await addKy12({ ...form, qty: +form.qty || 0, total_value: +form.total_value || 0 })
      showToast('บันทึกสำเร็จ'); setShowAdd(false); load()
    } catch (e: unknown) { showToast((e as Error).message, 'error') }
    finally { setSaving(false) }
  }

  const inp = (label: string, key: keyof typeof form, type = 'text') => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
    </div>
  )

  const totalValue = entries.reduce((s, e) => s + e.total_value, 0)

  return (
    <div className="p-6">
      <KyFormHeader title="ขย.12 — บัญชีการขายยาตามใบสั่งแพทย์" subtitle="บัญชีแสดงรายการจ่ายยาตามใบสั่งแพทย์" color="bg-teal-600" />
      <KyToolbar
        month={month}
        onMonthChange={setMonth}
        onAdd={() => setShowAdd(true)}
        onExportXlsx={() => exportKy12Xlsx(entries, month)}
      />
      {loading ? <Spinner /> : (
        <KyTable columns={columns} rows={entries} footerRow={{ total_value: `฿${totalValue.toLocaleString()}` }} />
      )}

      {showAdd && (
        <Modal title="เพิ่มรายการ ขย.12" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {inp('วันที่', 'date', 'date')}
              {inp('เลขใบสั่ง *', 'rx_no')}
              {inp('ชื่อผู้ป่วย *', 'patient_name')}
              {inp('แพทย์', 'doctor')}
              {inp('สถานพยาบาล', 'hospital')}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                รายการยา * <span className="text-teal-500 font-normal">— แสดงรายการที่ผูก ขย.12</span>
              </label>
              <KyDrugSelect kyType="ky12" value={form.drug_name}
                onChange={(name) => set('drug_name', name)} placeholder="พิมพ์หรือเลือกชื่อยา…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {inp('จำนวน', 'qty', 'number')}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">หน่วย</label>
                <select value={form.unit} onChange={e => set('unit', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                  {DRUG_UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              {inp('มูลค่า (฿)', 'total_value', 'number')}
              {inp('สถานะ', 'status')}
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>ยกเลิก</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'กำลังบันทึก…' : 'บันทึก'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
