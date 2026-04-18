import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { addDrug } from '../../api/drugs'
import { useToast } from '../../hooks/useToast'
import { DRUG_TYPES, DRUG_UNITS, KY_REPORT_OPTIONS } from '../../types/drug'
import AltUnitsEditor, { type AltUnitDraft, validateAltUnits } from './AltUnitsEditor'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function AddDrugModal({ onClose, onSaved }: Props) {
  const showToast = useToast()
  const [form, setForm] = useState({
    name: '', generic_name: '', type: 'ยาสามัญ', strength: '', barcode: '',
    retail: '', regular: '', wholesale: '',
    cost_price: '', stock: '', min_stock: '0', reg_no: '', unit: 'เม็ด',
  })
  const [reportTypes, setReportTypes] = useState<string[]>([])
  const [altUnits, setAltUnits] = useState<AltUnitDraft[]>([])
  const [lot, setLot] = useState({ lot_number: '', expiry_date: '', import_date: '' })
  const setLotField = (k: string, v: string) => setLot(l => ({ ...l, [k]: v }))
  const [loading, setLoading] = useState(false)

  // Reset lot fields when stock drops to 0 so old values don't resurface.
  useEffect(() => {
    if ((+form.stock || 0) === 0) {
      setLot({ lot_number: '', expiry_date: '', import_date: '' })
    }
  }, [form.stock])

  // Min date for expiry = tomorrow (backend requires strictly after today)
  const tomorrow = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })()
  const todayStr = new Date().toISOString().split('T')[0]

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const toggleKy = (val: string) =>
    setReportTypes(prev =>
      prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
    )

  const handleSave = async () => {
    if (!form.name) { showToast('กรุณากรอกชื่อยา', 'error'); return }
    const stockQty = +form.stock || 0
    if (stockQty > 0) {
      if (!lot.lot_number) { showToast('กรุณากรอกเลขล็อต', 'error'); return }
      if (!lot.expiry_date) { showToast('กรุณาระบุวันหมดอายุ', 'error'); return }
    }
    const validatedAlts = validateAltUnits(altUnits, form.unit)
    if (validatedAlts.error) { showToast(validatedAlts.error, 'error'); return }
    setLoading(true)
    try {
      const retail = +form.retail || 0
      await addDrug({
        name: form.name, generic_name: form.generic_name,
        type: form.type, strength: form.strength, barcode: form.barcode,
        sell_price: retail, cost_price: +form.cost_price || 0,
        stock: stockQty, min_stock: +form.min_stock || 0, reg_no: form.reg_no, unit: form.unit,
        report_types: reportTypes,
        alt_units: validatedAlts.units,
        prices: {
          retail,
          regular:   +form.regular   || 0,
          wholesale: +form.wholesale || 0,
        },
        ...(stockQty > 0 ? {
          create_lot: {
            lot_number: lot.lot_number,
            expiry_date: lot.expiry_date,
            import_date: lot.import_date || '',
            cost_price: null,
            sell_price: null,
            quantity: stockQty,
          }
        } : {}),
      })
      showToast('เพิ่มยาสำเร็จ')
      onSaved()
    } catch (e: unknown) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const field = (label: string, key: string, type = 'text', opts?: string[], autoFocus = false) => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {opts
        ? <select value={(form as Record<string, string>)[key]} onChange={e => set(key, e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400">
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        : <input type={type} value={(form as Record<string, string>)[key]}
            onChange={e => set(key, e.target.value)}
            autoFocus={autoFocus}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400" />
      }
    </div>
  )

  return (
    <Modal title="เพิ่มยาใหม่" onClose={onClose}>
      <div className="space-y-3">
        {field('ชื่อการค้า *', 'name', 'text', undefined, true)}
        {field('ชื่อสามัญ (Generic Name)', 'generic_name')}
        <div className="grid grid-cols-2 gap-3">
          {field('ขนาดยา', 'strength', 'text')}
          {field('บาร์โค้ด', 'barcode')}
          {field('ประเภท', 'type', 'text', DRUG_TYPES)}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">หน่วย</label>
            <input
              type="text"
              list="add-drug-unit-list"
              value={form.unit}
              onChange={e => set('unit', e.target.value)}
              placeholder="เม็ด, แคปซูล, ขวด…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400"
            />
            <datalist id="add-drug-unit-list">
              {DRUG_UNITS.map(u => <option key={u} value={u} />)}
            </datalist>
          </div>
          {field('ราคาทุน (฿)', 'cost_price', 'number')}
          <div />{/* filler to keep grid alignment */}
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
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">จำนวนสต็อกเริ่มต้น</label>
            <input type="number" min="0" step="1" value={form.stock}
              onChange={e => set('stock', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">แจ้งเตือนเมื่อสต็อก ≤</label>
            <input type="number" min="0" step="1" value={form.min_stock}
              onChange={e => set('min_stock', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400" />
          </div>
          {field('เลขทะเบียน', 'reg_no')}
        </div>

        {/* Lot fields — shown only when stock > 0 */}
        {(+form.stock || 0) > 0 && (
          <div className="border border-blue-300 rounded-lg p-3 bg-blue-50 space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm" aria-hidden="true">📦</span>
              <p className="text-xs font-semibold text-blue-700">
                ข้อมูลล็อตเริ่มต้น <span className="font-normal">({+form.stock} {form.unit || 'ชิ้น'})</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">เลขล็อต *</label>
                <input type="text" value={lot.lot_number}
                  onChange={e => setLotField('lot_number', e.target.value)}
                  placeholder="เช่น L001"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">วันหมดอายุ *</label>
                <input type="date" value={lot.expiry_date} min={tomorrow}
                  onChange={e => setLotField('expiry_date', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  วันนำเข้า <span className="text-gray-400 font-normal">(ไม่ระบุ = วันนี้)</span>
                </label>
                <input type="date" value={lot.import_date} max={todayStr}
                  onChange={e => setLotField('import_date', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400" />
              </div>
            </div>
          </div>
        )}

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

        <div className="sticky bottom-0 -mx-5 -mb-5 px-5 pb-4 pt-3 bg-white border-t border-gray-100 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>ยกเลิก</Button>
          <Button className="flex-1" onClick={handleSave} disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
