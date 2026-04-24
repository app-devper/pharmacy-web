import { useState, useEffect, useCallback } from 'react'
import type { Ky11 } from '../types/kyforms'
import { getKy11, addKy11 } from '../api/kyforms'
import { useToast } from '../hooks/useToast'
import KyFormHeader from '../components/kyforms/KyFormHeader'
import KyToolbar from '../components/kyforms/KyToolbar'
import KyTable from '../components/kyforms/KyTable'
import KyDrugSelect from '../components/kyforms/KyDrugSelect'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { DRUG_UNITS } from '../types/drug'
import { exportKy11Xlsx } from '../utils/exportXlsx'
import { todayBangkok, monthBangkok } from '../utils/date'

const columns = [
  { key: 'date', label: 'วันที่' },
  { key: 'drug_name', label: 'ชื่อยา' },
  { key: 'reg_no', label: 'ทะเบียนยา' },
  { key: 'qty', label: 'จำนวน', align: 'right' as const },
  { key: 'unit', label: 'หน่วย' },
  { key: 'buyer_name', label: 'ชื่อผู้รับ' },
  { key: 'purpose', label: 'วัตถุประสงค์' },
  { key: 'pharmacist', label: 'เภสัชกรผู้จ่าย' },
]

const empty = {
  date: todayBangkok(),
  drug_name: '', reg_no: '', qty: '', unit: 'เม็ด',
  buyer_name: '', purpose: '', pharmacist: '',
}

export default function Ky11Page() {
  const [entries, setEntries] = useState<Ky11[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => monthBangkok())
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const showToast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try { setEntries(await getKy11(month)) }
    catch (e: unknown) { showToast((e as Error).message, 'error') }
    finally { setLoading(false) }
  }, [month, showToast])

  useEffect(() => { load() }, [load])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.drug_name || !form.buyer_name) { showToast('กรุณากรอกข้อมูลให้ครบ', 'error'); return }
    setSaving(true)
    try {
      await addKy11({ ...form, qty: +form.qty || 0 })
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
      <KyFormHeader title="ขย.11 — บัญชีการขายยาอันตราย" subtitle="บัญชีแสดงรายการขายยาอันตราย" color="bg-red-600" />
      <KyToolbar
        month={month}
        onMonthChange={setMonth}
        onAdd={() => setShowAdd(true)}
        onExportXlsx={() => exportKy11Xlsx(entries, month)}
      />
      {loading ? <Spinner /> : <KyTable columns={columns} rows={entries} />}

      {showAdd && (
        <Modal title="เพิ่มรายการ ขย.11" onClose={() => setShowAdd(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {inp('วันที่', 'date', 'date')}
              {inp('ทะเบียนยา', 'reg_no')}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                ชื่อยา * <span className="text-red-500 font-normal">— แสดงรายการที่ผูก ขย.11</span>
              </label>
              <KyDrugSelect kyType="ky11" value={form.drug_name}
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
              {inp('ชื่อผู้รับ *', 'buyer_name')}
              {inp('วัตถุประสงค์', 'purpose')}
              {inp('เภสัชกร', 'pharmacist')}
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
