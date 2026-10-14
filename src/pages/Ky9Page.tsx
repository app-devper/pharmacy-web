import type { Ky9 } from '../types/kyforms'
import { useKyRegister } from '../hooks/useKyRegister'
import { KY9 } from '../lib/kyRegister'
import KyFormHeader from '../components/kyforms/KyFormHeader'
import KyToolbar from '../components/kyforms/KyToolbar'
import KyTable from '../components/kyforms/KyTable'
import KyDrugSelect from '../components/kyforms/KyDrugSelect'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { DRUG_UNITS } from '../types/drug'
import { todayBangkok } from '../utils/date'

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

const empty = {
  date: '', drug_name: '', reg_no: '', unit: 'เม็ด',
  qty: '', price_per_unit: '', seller: '', invoice_no: '',
}

export default function Ky9Page() {
  const { month, setMonth, rows: entries, loading, exportXlsx, form, open, close, set, save, saving } =
    useKyRegister(KY9, () => ({ ...empty, date: todayBangkok() }))

  const totalValue = entries.reduce((s, e) => s + e.total_value, 0)

  const inp = (label: string, key: keyof typeof empty, type = 'text', wide = false) => (
    <div key={key} className={wide ? 'col-span-2' : undefined}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={type} value={form?.[key] ?? ''} onChange={e => set(key, e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
    </div>
  )

  return (
    <div className="p-6">
      <KyFormHeader title="ขย.9 — บัญชีการซื้อยา" subtitle="บัญชีแสดงรายการซื้อยาและผลิตภัณฑ์สุขภาพ" color="bg-blue-600" />
      <KyToolbar
        month={month}
        onMonthChange={setMonth}
        onAdd={open}
        onExportXlsx={exportXlsx}
      />
      {loading ? <Spinner /> : (
        <KyTable columns={columns} rows={entries} footerRow={{ total_value: `฿${totalValue.toLocaleString()}` }} />
      )}

      {form && (
        <Modal title="เพิ่มรายการ ขย.9" onClose={close}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {inp('วันที่', 'date', 'date')}
              {inp('เลขทะเบียน', 'reg_no')}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                ชื่อยา * <span className="text-blue-500 font-normal">— แสดงรายการที่ผูก ขย.9</span>
              </label>
              <KyDrugSelect
                kyType="ky9"
                value={form.drug_name}
                onChange={(name, regNo, unit) => {
                  set('drug_name', name)
                  if (regNo) set('reg_no', regNo)
                  if (unit) set('unit', unit)
                }}
                placeholder="พิมพ์หรือเลือกชื่อยา…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {inp('จำนวน *', 'qty', 'number')}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">หน่วย</label>
                <select value={form.unit} onChange={e => set('unit', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                  {DRUG_UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              {inp('ราคา/หน่วย', 'price_per_unit', 'number')}
              {inp('ผู้ขาย/บริษัท', 'seller')}
              {inp('เลขใบส่งของ', 'invoice_no', 'text', true)}
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" className="flex-1" onClick={close}>ยกเลิก</Button>
              <Button className="flex-1" onClick={save} disabled={saving}>
                {saving ? 'กำลังบันทึก…' : 'บันทึก'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
