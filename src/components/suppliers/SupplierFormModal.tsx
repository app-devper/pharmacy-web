import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { createSupplier, updateSupplier } from '../../api/suppliers'
import { useToast } from '../../hooks/useToast'
import type { Supplier, SupplierInput } from '../../types/supplier'

interface Props {
  supplier?: Supplier   // set for edit mode
  onClose: () => void
  onSaved: () => void
}

const FIELDS: { key: keyof SupplierInput; label: string }[] = [
  { key: 'name',         label: 'ชื่อบริษัท / ร้านค้า *' },
  { key: 'contact_name', label: 'ผู้ติดต่อ' },
  { key: 'phone',        label: 'เบอร์โทรศัพท์' },
  { key: 'address',      label: 'ที่อยู่' },
  { key: 'tax_id',       label: 'เลขประจำตัวผู้เสียภาษี' },
  { key: 'notes',        label: 'หมายเหตุ' },
]

export default function SupplierFormModal({ supplier, onClose, onSaved }: Props) {
  const showToast = useToast()
  const [form, setForm] = useState<SupplierInput>({
    name:         supplier?.name         ?? '',
    contact_name: supplier?.contact_name ?? '',
    phone:        supplier?.phone        ?? '',
    address:      supplier?.address      ?? '',
    tax_id:       supplier?.tax_id       ?? '',
    notes:        supplier?.notes        ?? '',
  })
  const [loading, setLoading] = useState(false)

  const set = (k: keyof SupplierInput, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('กรุณากรอกชื่อบริษัท', 'error'); return }
    setLoading(true)
    try {
      if (supplier) {
        await updateSupplier(supplier.id, form)
        showToast('อัปเดตซัพพลายเออร์สำเร็จ')
      } else {
        await createSupplier(form)
        showToast('เพิ่มซัพพลายเออร์สำเร็จ')
      }
      onSaved()
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={supplier ? 'แก้ไขซัพพลายเออร์' : 'เพิ่มซัพพลายเออร์ใหม่'} onClose={onClose}>
      <div className="space-y-3">
        {FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <input
              type="text"
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
