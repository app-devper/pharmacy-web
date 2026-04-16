import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { addDrug } from '../../api/drugs'
import { useToast } from '../../hooks/useToast'
import { DRUG_TYPES, DRUG_UNITS, KY_REPORT_OPTIONS } from '../../types/drug'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function AddDrugModal({ onClose, onSaved }: Props) {
  const showToast = useToast()
  const [form, setForm] = useState({
    name: '', generic_name: '', type: 'ยาสามัญ', strength: '', barcode: '',
    sell_price: '', cost_price: '', stock: '', min_stock: '0', reg_no: '', unit: 'เม็ด',
  })
  const [reportTypes, setReportTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const toggleKy = (val: string) =>
    setReportTypes(prev =>
      prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
    )

  const handleSave = async () => {
    if (!form.name) { showToast('กรุณากรอกชื่อยา', 'error'); return }
    setLoading(true)
    try {
      await addDrug({
        name: form.name, generic_name: form.generic_name,
        type: form.type, strength: form.strength, barcode: form.barcode,
        sell_price: +form.sell_price || 0, cost_price: +form.cost_price || 0,
        stock: +form.stock || 0, min_stock: +form.min_stock || 0, reg_no: form.reg_no, unit: form.unit,
        report_types: reportTypes,
      })
      showToast('เพิ่มยาสำเร็จ')
      onSaved()
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const field = (label: string, key: string, type = 'text', opts?: string[]) => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {opts
        ? <select value={(form as Record<string, string>)[key]} onChange={e => set(key, e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        : <input type={type} value={(form as Record<string, string>)[key]} onChange={e => set(key, e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
      }
    </div>
  )

  return (
    <Modal title="เพิ่มยาใหม่" onClose={onClose}>
      <div className="space-y-3">
        {field('ชื่อการค้า *', 'name')}
        {field('ชื่อสามัญ (Generic Name)', 'generic_name')}
        <div className="grid grid-cols-2 gap-3">
          {field('ขนาดยา', 'strength', 'text')}
          {field('บาร์โค้ด', 'barcode')}
          {field('ประเภท', 'type', 'text', DRUG_TYPES)}
          {field('หน่วย', 'unit', 'text', DRUG_UNITS)}
          {field('ราคาทุน (฿)', 'cost_price', 'number')}
          {field('ราคาขาย (฿)', 'sell_price', 'number')}
          {field('จำนวนสต็อกเริ่มต้น', 'stock', 'number')}
          {field('แจ้งเตือนเมื่อสต็อก ≤', 'min_stock', 'number')}
          {field('เลขทะเบียน', 'reg_no')}
        </div>

        {/* Report Types */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            ผูกกับรายงาน ขย. <span className="text-gray-400 font-normal">(เลือกได้หลายรายการ)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {KY_REPORT_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  reportTypes.includes(opt.value)
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={reportTypes.includes(opt.value)}
                  onChange={() => toggleKy(opt.value)}
                  className="accent-blue-600"
                />
                <div>
                  <span className={`text-xs font-bold ${opt.color.split(' ')[1]}`}>{opt.label}</span>
                  <span className="text-xs text-gray-500 ml-1">{opt.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>ยกเลิก</Button>
          <Button className="flex-1" onClick={handleSave} disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
