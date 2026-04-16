import { useState, useEffect } from 'react'
import type { Ky10 } from '../types/kyforms'
import { getKy10, addKy10 } from '../api/kyforms'
import { useToast } from '../hooks/useToast'
import KyFormHeader from '../components/kyforms/KyFormHeader'
import KyToolbar from '../components/kyforms/KyToolbar'
import KyTable from '../components/kyforms/KyTable'
import KyDrugSelect from '../components/kyforms/KyDrugSelect'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { DRUG_UNITS } from '../types/drug'
import { exportKy10Xlsx } from '../utils/exportXlsx'
import { exportKy10Pdf } from '../utils/exportPdf'

const columns = [
  { key: 'date', label: 'วันที่' },
  { key: 'drug_name', label: 'ชื่อยา' },
  { key: 'reg_no', label: 'ทะเบียน' },
  { key: 'qty', label: 'จำนวน', align: 'right' as const },
  { key: 'unit', label: 'หน่วย' },
  { key: 'buyer_name', label: 'ชื่อผู้ซื้อ' },
  { key: 'buyer_address', label: 'ที่อยู่' },
  { key: 'rx_no', label: 'เลขใบสั่ง' },
  { key: 'doctor', label: 'แพทย์' },
  { key: 'balance', label: 'คงเหลือ', align: 'right' as const },
]

const empty = {
  date: new Date().toISOString().split('T')[0],
  drug_name: '', reg_no: '', qty: '', unit: 'เม็ด',
  buyer_name: '', buyer_address: '', rx_no: '', doctor: '', balance: '',
}

export default function Ky10Page() {
  const [entries, setEntries] = useState<Ky10[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  const load = async () => {
    setLoading(true)
    try { setEntries(await getKy10(month)) }
    catch (e: unknown) { showToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [month])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.drug_name || !form.buyer_name) { showToast('กรุณากรอกข้อมูลให้ครบ', 'error'); return }
    setSaving(true)
    try {
      await addKy10({ ...form, qty: +form.qty || 0, balance: +form.balance || 0 })
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

  return (
    <div className="p-6">
      <KyFormHeader title="ขย.10 — บัญชีการขายยาควบคุมพิเศษ" subtitle="บัญชีแสดงรายการขายยาควบคุมพิเศษ" color="bg-purple-600" />
      <KyToolbar
        month={month}
        onMonthChange={setMonth}
        onAdd={() => setShowAdd(true)}
        onExportPdf={() => exportKy10Pdf(entries, month)}
        onExportXlsx={() => exportKy10Xlsx(entries, month)}
      />
      {loading ? <Spinner /> : <KyTable columns={columns} rows={entries} />}

      {showAdd && (
        <Modal title="เพิ่มรายการ ขย.10" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {inp('วันที่', 'date', 'date')}
              {inp('ทะเบียน', 'reg_no')}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                ชื่อยา * <span className="text-purple-500 font-normal">— แสดงรายการที่ผูก ขย.10</span>
              </label>
              <KyDrugSelect kyType="ky10" value={form.drug_name}
                onChange={(name) => set('drug_name', name)} placeholder="พิมพ์หรือเลือกชื่อยา..." />
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
              {inp('ชื่อผู้ซื้อ *', 'buyer_name')}
              {inp('ที่อยู่', 'buyer_address')}
              {inp('เลขใบสั่ง', 'rx_no')}
              {inp('แพทย์', 'doctor')}
              {inp('คงเหลือ', 'balance', 'number')}
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>ยกเลิก</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
