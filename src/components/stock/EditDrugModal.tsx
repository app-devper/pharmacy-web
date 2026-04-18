import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { updateDrug } from '../../api/drugs'
import { useToast } from '../../hooks/useToast'
import { DRUG_TYPES, DRUG_UNITS, KY_REPORT_OPTIONS, getDrugSellPrice } from '../../types/drug'
import type { Drug } from '../../types/drug'
import AltUnitsEditor, { type AltUnitDraft, validateAltUnits } from './AltUnitsEditor'

interface Props {
  drug: Drug
  onClose: () => void
  onSaved: () => void
}

export default function EditDrugModal({ drug, onClose, onSaved }: Props) {
  const showToast = useToast()
  const retailInit = drug.prices?.retail || getDrugSellPrice(drug)
  const [form, setForm] = useState({
    name: drug.name,
    generic_name: drug.generic_name ?? '',
    type: drug.type,
    strength: drug.strength ?? '',
    barcode: drug.barcode ?? '',
    retail:    String(retailInit),
    regular:   drug.prices?.regular   ? String(drug.prices.regular)   : '',
    wholesale: drug.prices?.wholesale ? String(drug.prices.wholesale) : '',
    cost_price: String(drug.cost_price ?? ''),
    min_stock: String(drug.min_stock ?? 0),
    reg_no: drug.reg_no ?? '',
    unit: drug.unit,
  })
  const [reportTypes, setReportTypes] = useState<string[]>(drug.report_types ?? [])
  const [altUnits, setAltUnits] = useState<AltUnitDraft[]>(
    (drug.alt_units ?? []).map(a => ({
      name: a.name,
      factor: String(a.factor),
      retail:    String(a.prices?.retail    ?? a.sell_price ?? ''),
      regular:   a.prices?.regular   ? String(a.prices.regular)   : '',
      wholesale: a.prices?.wholesale ? String(a.prices.wholesale) : '',
    })),
  )
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const toggleKy = (val: string) =>
    setReportTypes(prev =>
      prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
    )

  const handleSave = async () => {
    if (!form.name) { showToast('กรุณากรอกชื่อยา', 'error'); return }
    const validatedAlts = validateAltUnits(altUnits, form.unit)
    if (validatedAlts.error) { showToast(validatedAlts.error, 'error'); return }
    setLoading(true)
    try {
      const retail = +form.retail || 0
      await updateDrug(drug.id, {
        name: form.name, generic_name: form.generic_name,
        type: form.type, strength: form.strength, barcode: form.barcode,
        sell_price: retail, cost_price: +form.cost_price || 0,
        min_stock: +form.min_stock || 0, reg_no: form.reg_no, unit: form.unit,
        report_types: reportTypes,
        alt_units: validatedAlts.units,
        prices: {
          retail,
          regular:   +form.regular   || 0,
          wholesale: +form.wholesale || 0,
        },
      })
      showToast('แก้ไขยาสำเร็จ')
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
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400">
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        : <input type={type} value={(form as Record<string, string>)[key]} onChange={e => set(key, e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400" />
      }
    </div>
  )

  return (
    <Modal title={`แก้ไข — ${drug.name}`} onClose={onClose}>
      <div className="space-y-3">
        {field('ชื่อการค้า *', 'name')}
        {field('ชื่อสามัญ (Generic Name)', 'generic_name')}
        <div className="grid grid-cols-2 gap-3">
          {field('ขนาดยา', 'strength')}
          {field('บาร์โค้ด', 'barcode')}
          {field('ประเภท', 'type', 'text', DRUG_TYPES)}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">หน่วย</label>
            <input
              type="text"
              list="edit-drug-unit-list"
              value={form.unit}
              onChange={e => set('unit', e.target.value)}
              placeholder="เม็ด, แคปซูล, ขวด…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400"
            />
            <datalist id="edit-drug-unit-list">
              {DRUG_UNITS.map(u => <option key={u} value={u} />)}
            </datalist>
          </div>
          {field('ราคาทุน (฿)', 'cost_price', 'number')}
          <div />
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              ราคาขาย (฿) <span className="text-gray-400 font-normal">— หน้าร้านบังคับ · อื่นว่างได้</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-[10px] text-gray-400 mb-0.5">หน้าร้าน *</div>
                <input type="number" min="0" step="0.01" value={form.retail}
                  onChange={e => set('retail', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 mb-0.5">ประจำ</div>
                <input type="number" min="0" step="0.01" value={form.regular}
                  onChange={e => set('regular', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 mb-0.5">ขายส่ง</div>
                <input type="number" min="0" step="0.01" value={form.wholesale}
                  onChange={e => set('wholesale', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:border-blue-400" />
              </div>
            </div>
          </div>
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

        {/* Alt units (multi-unit pricing) */}
        <AltUnitsEditor
          baseUnit={form.unit || 'หน่วย'}
          value={altUnits}
          onChange={setAltUnits}
        />

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
