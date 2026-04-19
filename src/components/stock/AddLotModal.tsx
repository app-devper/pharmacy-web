import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { addLot } from '../../api/drugs'
import { useToast } from '../../hooks/useToast'
import { Drug, getDrugSellPrice } from '../../types/drug'
import { genLotNumber } from '../../utils/lot'

interface Props {
  drug: Drug
  onClose: () => void
  onSaved: () => void
}

export default function AddLotModal({ drug, onClose, onSaved }: Props) {
  const showToast = useToast()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    lot_number: '',
    expiry_date: '',
    import_date: today,
    quantity: '',
    cost_price: '',
    sell_price: '',
  })
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.lot_number) { showToast('กรุณาระบุล็อตหมายเลข', 'error'); return }
    if (!form.expiry_date) { showToast('กรุณาระบุวันหมดอายุ', 'error'); return }
    const qty = parseInt(form.quantity)
    if (!qty || qty <= 0) { showToast('จำนวนต้องมากกว่า 0', 'error'); return }

    setLoading(true)
    try {
      await addLot(drug.id, {
        lot_number: form.lot_number,
        expiry_date: form.expiry_date,
        import_date: form.import_date || today,
        quantity: qty,
        cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
        sell_price: form.sell_price ? parseFloat(form.sell_price) : null,
      })
      showToast('เพิ่มล็อตสำเร็จ')
      onSaved()
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const inp = (label: string, key: string, type = 'text', placeholder = '') => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={(form as Record<string, string>)[key]}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
      />
    </div>
  )

  return (
    <Modal title={`เพิ่มล็อต — ${drug.name}`} onClose={onClose}>
      <div className="space-y-3">
        {/* ล็อตหมายเลข + ปุ่ม Gen */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">ล็อตหมายเลข *</label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={form.lot_number}
              onChange={e => set('lot_number', e.target.value)}
              placeholder="กรอกเอง หรือกด Gen"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
            <button
              type="button"
              onClick={() => set('lot_number', genLotNumber())}
              className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-500 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-colors shrink-0"
            >Gen</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {inp('วันนำเข้า', 'import_date', 'date')}
          {inp('วันหมดอายุ *', 'expiry_date', 'date')}
        </div>
        {inp('จำนวน (หน่วย: ' + drug.unit + ') *', 'quantity', 'number', '0')}

        <div>
          <p className="text-xs font-medium text-gray-500 mb-2 border-t pt-2">
            ราคาเฉพาะล็อตนี้ <span className="font-normal text-gray-400">(เว้นว่างเพื่อใช้ราคาค่าเริ่มต้นของยา)</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            {inp('ราคาทุน (฿)', 'cost_price', 'number', `${drug.cost_price || '—'}`)}
            {inp('ราคาขาย (฿)', 'sell_price', 'number', `${getDrugSellPrice(drug) || '—'}`)}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1" onClick={onClose}>ยกเลิก</Button>
          <Button className="flex-1" onClick={handleSave} disabled={loading}>
            {loading ? 'กำลังบันทึก…' : 'บันทึก'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
