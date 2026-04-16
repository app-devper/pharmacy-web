import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import KyDrugSelect from './KyDrugSelect'
import { addKy9 } from '../../api/kyforms'
import { useToast } from '../../hooks/useToast'
import { DRUG_UNITS } from '../../types/drug'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function AddKy9Modal({ onClose, onSaved }: Props) {
  const showToast = useToast()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    date: today, drug_name: '', reg_no: '', unit: 'เม็ด',
    qty: '', price_per_unit: '', seller: '', invoice_no: '',
  })
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleDrugSelect = (name: string, regNo: string, unit: string) => {
    setForm(f => ({ ...f, drug_name: name, reg_no: regNo || f.reg_no, unit: unit || f.unit }))
  }

  const handleSave = async () => {
    if (!form.drug_name || !form.qty || !form.price_per_unit) {
      showToast('กรุณากรอกข้อมูลให้ครบ', 'error'); return
    }
    setLoading(true)
    try {
      await addKy9({
        date: form.date, drug_name: form.drug_name, reg_no: form.reg_no,
        unit: form.unit, qty: +form.qty, price_per_unit: +form.price_per_unit,
        seller: form.seller, invoice_no: form.invoice_no,
      })
      showToast('บันทึกสำเร็จ')
      onSaved()
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="เพิ่มรายการ ขย.9" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">วันที่</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">เลขทะเบียน</label>
            <input type="text" value={form.reg_no} onChange={e => set('reg_no', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            ชื่อยา * <span className="text-blue-500 font-normal">— แสดงรายการที่ผูก ขย.9</span>
          </label>
          <KyDrugSelect
            kyType="ky9"
            value={form.drug_name}
            onChange={handleDrugSelect}
            placeholder="พิมพ์หรือเลือกชื่อยา..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">จำนวน *</label>
            <input type="number" value={form.qty} onChange={e => set('qty', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">หน่วย</label>
            <select value={form.unit} onChange={e => set('unit', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
              {DRUG_UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ราคา/หน่วย *</label>
            <input type="number" value={form.price_per_unit} onChange={e => set('price_per_unit', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">ผู้ขาย/บริษัท</label>
            <input type="text" value={form.seller} onChange={e => set('seller', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">เลขใบส่งของ</label>
            <input type="text" value={form.invoice_no} onChange={e => set('invoice_no', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
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
