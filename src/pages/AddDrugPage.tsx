import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import { addDrug } from '../api/drugs'
import { useToast } from '../hooks/useToast'
import { useDrugs } from '../hooks/useDrugs'
import { DRUG_TYPES, DRUG_UNITS, KY_REPORT_OPTIONS } from '../types/drug'
import { genLotNumber } from '../utils/lot'

export default function AddDrugPage() {
  const navigate = useNavigate()
  const showToast = useToast()
  const { reload: reloadDrugs } = useDrugs()

  const [form, setForm] = useState({
    name: '', generic_name: '', type: 'ยาสามัญ', strength: '', barcode: '',
    retail: '',
    cost_price: '', stock: '', min_stock: '0', reg_no: '', unit: 'เม็ด',
  })
  const [reportTypes, setReportTypes] = useState<string[]>([])
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
    setLoading(true)
    try {
      const retail = +form.retail || 0
      await addDrug({
        name: form.name, generic_name: form.generic_name,
        type: form.type, strength: form.strength, barcode: form.barcode,
        sell_price: retail, cost_price: +form.cost_price || 0,
        stock: stockQty, min_stock: +form.min_stock || 0, reg_no: form.reg_no, unit: form.unit,
        report_types: reportTypes,
        // Only retail is set on creation. Extra tiers (ประจำ / ขายส่ง / custom)
        // are added later in the Edit page.
        prices: { retail },
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
      reloadDrugs()
      navigate('/stock')
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

  const stockQty = +form.stock || 0

  return (
    <div className="p-6 max-w-4xl mx-auto pb-24">
      {/* Back link */}
      <button
        onClick={() => navigate('/stock')}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
      >
        ← กลับไปสต็อกยา
      </button>

      <div className="space-y-4">
        {/* ── Section: ข้อมูลทั่วไป ────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span aria-hidden="true">💊</span> ข้อมูลทั่วไป
          </h2>
          <div className="space-y-3">
            {field('ชื่อการค้า *', 'name', 'text', undefined, true)}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {field('ชื่อสามัญ (Generic Name)', 'generic_name')}
              {field('ขนาดยา', 'strength')}
              {field('ประเภท', 'type', 'text', DRUG_TYPES)}
              {field('เลขทะเบียน', 'reg_no')}
            </div>
          </div>
        </section>

        {/* ── Section: ข้อมูลหน่วยนับ และการขาย ──────────────────── */}
        <section className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span aria-hidden="true">💰</span> ข้อมูลหน่วยนับ และการขาย
          </h2>
          {/* Row 1: หน่วย */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">หน่วย</label>
            <input
              type="text"
              list="add-drug-unit-list"
              value={form.unit}
              onChange={e => set('unit', e.target.value)}
              placeholder="เม็ด, แคปซูล, ขวด…"
              className="w-full md:w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400"
            />
            <datalist id="add-drug-unit-list">
              {DRUG_UNITS.map(u => <option key={u} value={u} />)}
            </datalist>
          </div>
          {/* Row 2: ราคา (ทุน · หน้าร้าน) */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ราคาทุน (฿)</label>
              <input type="number" min="0" step="0.01" value={form.cost_price}
                onChange={e => set('cost_price', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ราคาขาย (หน้าร้าน) *</label>
              <input type="number" min="0" step="0.01" value={form.retail}
                onChange={e => set('retail', e.target.value)}
                className="w-full border border-blue-300 bg-blue-50/30 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400" />
            </div>
          </div>
          {/* Row 3: บาร์โค้ด (ใต้ราคา) */}
          <div className="mb-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">บาร์โค้ด</label>
            <input type="text" value={form.barcode}
              onChange={e => set('barcode', e.target.value)}
              className="w-full md:w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400" />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            เพิ่มราคาระดับอื่น (ประจำ / ขายส่ง / VIP ฯลฯ) + หน่วยทางเลือก ได้ภายหลังในหน้าแก้ไขยา
          </p>
        </section>

        {/* ── Section: สต็อก + Lot ──────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span aria-hidden="true">📦</span> สต็อกเริ่มต้น
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">จำนวน</label>
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
          </div>

          {stockQty > 0 && (
            <div className="mt-4 border border-blue-300 rounded-lg p-3 bg-blue-50 space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm" aria-hidden="true">📦</span>
                <p className="text-xs font-semibold text-blue-700">
                  ข้อมูลล็อตเริ่มต้น <span className="font-normal">({stockQty} {form.unit || 'ชิ้น'})</span>
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">เลขล็อต *</label>
                  <div className="flex gap-1.5">
                    <input type="text" value={lot.lot_number}
                      onChange={e => setLotField('lot_number', e.target.value)}
                      placeholder="กรอกเอง หรือกด Gen"
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400" />
                    <button
                      type="button"
                      onClick={() => setLotField('lot_number', genLotNumber())}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-500 bg-white hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-colors shrink-0"
                    >Gen</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">วันหมดอายุ *</label>
                  <input type="date" value={lot.expiry_date} min={tomorrow}
                    onChange={e => setLotField('expiry_date', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400" />
                </div>
                <div className="md:col-span-2">
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
        </section>

        {/* ── Section: รายงาน ขย. ───────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span aria-hidden="true">📋</span> รายงาน ขย.
            <span className="text-xs font-normal text-gray-400">(เลือกได้หลายรายการ)</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
                  <span className="block text-[10px] text-gray-500">{opt.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </section>
      </div>

      {/* Sticky footer — visible while scrolling long forms */}
      <div className="fixed bottom-0 left-56 right-0 bg-white border-t border-gray-200 px-6 py-3 flex gap-2 justify-end shadow-[0_-4px_12px_-8px_rgba(0,0,0,0.1)] z-10">
        <Button variant="secondary" onClick={() => navigate('/stock')} disabled={loading}>
          ยกเลิก
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'กำลังบันทึก…' : 'บันทึก'}
        </Button>
      </div>
    </div>
  )
}
