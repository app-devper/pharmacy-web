import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { addCustomer } from '../../api/customers'
import { useToast } from '../../hooks/useToast'
import type { PriceTier } from '../../types/drug'

interface Props {
  onClose: () => void
  onSaved: () => void
}

type PriceTierValue = '' | PriceTier

export default function AddCustomerModal({ onClose, onSaved }: Props) {
  const showToast = useToast()
  const [form, setForm] = useState<{
    name: string; phone: string; disease: string; price_tier: PriceTierValue
  }>({ name: '', phone: '', disease: '', price_tier: '' })
  const [loading, setLoading] = useState(false)

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name) { showToast('กรุณากรอกชื่อ', 'error'); return }
    setLoading(true)
    try {
      await addCustomer({
        name: form.name,
        phone: form.phone,
        disease: form.disease || '-',
        price_tier: form.price_tier,
      })
      showToast('เพิ่มลูกค้าสำเร็จ')
      onSaved()
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400'

  return (
    <Modal title="เพิ่มลูกค้าใหม่" onClose={onClose}>
      <div className="space-y-3">
        {(['name', 'phone', 'disease'] as const).map(key => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {key === 'name' ? 'ชื่อ-นามสกุล *' : key === 'phone' ? 'เบอร์โทร' : 'โรคประจำตัว / แพ้ยา'}
            </label>
            <input
              type={key === 'phone' ? 'tel' : 'text'}
              value={form[key]}
              onChange={e => set(key, e.target.value)}
              className={inputCls}
            />
          </div>
        ))}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            ราคาที่ใช้ประจำ <span className="text-gray-400 font-normal">(ไม่ระบุ = หน้าร้าน)</span>
          </label>
          <select
            value={form.price_tier}
            onChange={e => set('price_tier', e.target.value as PriceTierValue)}
            className={inputCls}
          >
            <option value="">— หน้าร้าน (default) —</option>
            <option value="regular">ประจำ</option>
            <option value="wholesale">ขายส่ง</option>
          </select>
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
