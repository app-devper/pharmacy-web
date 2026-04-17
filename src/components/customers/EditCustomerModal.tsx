import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { updateCustomer } from '../../api/customers'
import { useToast } from '../../hooks/useToast'
import type { Customer } from '../../types/customer'

interface Props {
  customer: Customer
  onClose: () => void
  onSaved: () => void
}

export default function EditCustomerModal({ customer, onClose, onSaved }: Props) {
  const showToast = useToast()
  const [form, setForm] = useState({
    name:    customer.name,
    phone:   customer.phone    ?? '',
    disease: customer.disease  ?? '',
  })
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name) { showToast('กรุณากรอกชื่อ', 'error'); return }
    setLoading(true)
    try {
      await updateCustomer(customer.id, {
        name:    form.name,
        phone:   form.phone,
        disease: form.disease || '-',
      })
      showToast('แก้ไขข้อมูลสำเร็จ')
      onSaved()
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="แก้ไขข้อมูลลูกค้า" onClose={onClose}>
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
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
        ))}
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
