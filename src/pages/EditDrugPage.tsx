import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { updateDrug } from '../api/drugs'
import { useToast } from '../hooks/useToast'
import { useDrugs } from '../hooks/useDrugs'
import { DRUG_TYPES, DRUG_UNITS, KY_REPORT_OPTIONS, getDrugSellPrice } from '../types/drug'
import AltUnitsEditor, { type AltUnitDraft, validateAltUnits } from '../components/stock/AltUnitsEditor'
import PriceTiersEditor, {
  type TierDraft,
  draftsToPriceTiers,
  priceTiersToDrafts,
} from '../components/stock/PriceTiersEditor'

export default function EditDrugPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const showToast = useToast()
  const { drugs, loading: drugsLoading, reload: reloadDrugs } = useDrugs()

  // Lookup drug from the shared cache by URL param.
  const drug = useMemo(() => drugs.find(d => d.id === id), [drugs, id])

  const [form, setForm] = useState<null | {
    name: string; generic_name: string; type: string; strength: string; barcode: string
    retail: string
    cost_price: string; min_stock: string; reg_no: string; unit: string
  }>(null)
  const [priceTiers, setPriceTiers] = useState<TierDraft[]>([])
  const [reportTypes, setReportTypes] = useState<string[]>([])
  const [altUnits, setAltUnits] = useState<AltUnitDraft[]>([])
  const [loading, setLoading] = useState(false)
  // Seed the form only once when the drug first arrives in the cache. Later
  // background updates (e.g. patchStocks after a sibling sale) mustn't wipe
  // the user's in-progress edits.
  const seededRef = useRef(false)

  useEffect(() => {
    if (!drug || seededRef.current) return
    seededRef.current = true
    const retailInit = drug.prices?.retail || getDrugSellPrice(drug)
    setForm({
      name: drug.name,
      generic_name: drug.generic_name ?? '',
      type: drug.type,
      strength: drug.strength ?? '',
      barcode: drug.barcode ?? '',
      retail: String(retailInit),
      cost_price: String(drug.cost_price ?? ''),
      min_stock: String(drug.min_stock ?? 0),
      reg_no: drug.reg_no ?? '',
      unit: drug.unit,
    })
    // Extras only — retail is managed by the form's dedicated input.
    setPriceTiers(priceTiersToDrafts(drug.prices))
    setReportTypes(drug.report_types ?? [])
    setAltUnits(
      (drug.alt_units ?? []).map(a => ({
        name: a.name,
        factor: String(a.factor),
        retail: String(a.prices?.retail ?? a.sell_price ?? ''),
        // Extract non-retail extras from the alt unit's price map. Helper skips
        // retail + zeros so legacy {regular: 0, wholesale: 0} docs stay clean.
        extraTiers: priceTiersToDrafts(a.prices),
        barcode: a.barcode ?? '',
        hidden:  !!a.hidden,
      })),
    )
  }, [drug])

  const set = (k: string, v: string) =>
    setForm(f => (f ? { ...f, [k]: v } : f))

  const toggleKy = (val: string) =>
    setReportTypes(prev =>
      prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
    )

  if (drugsLoading && !form) return <Spinner />
  if (!form || !drug) {
    return (
      <div className="p-6">
        <div className="text-sm text-gray-500">ไม่พบยาที่ระบุ (id: {id})</div>
        <button
          onClick={() => navigate('/stock')}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >← กลับไปสต็อกยา</button>
      </div>
    )
  }

  const handleSave = async () => {
    if (!form.name) { showToast('กรุณากรอกชื่อยา', 'error'); return }
    const validatedAlts = validateAltUnits(altUnits, form.unit)
    if (validatedAlts.error) { showToast(validatedAlts.error, 'error'); return }
    const retail = +form.retail || 0
    const prices = draftsToPriceTiers(priceTiers, retail)
    setLoading(true)
    try {
      await updateDrug(drug.id, {
        name: form.name, generic_name: form.generic_name,
        type: form.type, strength: form.strength, barcode: form.barcode,
        sell_price: retail, cost_price: +form.cost_price || 0,
        min_stock: +form.min_stock || 0, reg_no: form.reg_no, unit: form.unit,
        report_types: reportTypes,
        alt_units: validatedAlts.units,
        prices,
      })
      showToast('แก้ไขยาสำเร็จ')
      reloadDrugs()
      navigate('/stock')
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
    <div className="p-6 max-w-4xl mx-auto pb-24">
      {/* Back link + current stock snapshot */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/stock')}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          ← กลับไปสต็อกยา
        </button>
        <div className="text-xs text-gray-400">
          สต็อกปัจจุบัน: <span className="font-semibold text-gray-700">{drug.stock}</span> {drug.unit}
        </div>
      </div>

      <div className="space-y-4">
        {/* ── Section: ข้อมูลทั่วไป ────────────────────────────────── */}
        <section className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span aria-hidden="true">💊</span> ข้อมูลทั่วไป
            <span className="text-xs font-normal text-gray-400 ml-1">— {drug.name}</span>
          </h2>
          <div className="space-y-3">
            {field('ชื่อการค้า *', 'name')}
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
              list="edit-drug-unit-list"
              value={form.unit}
              onChange={e => set('unit', e.target.value)}
              placeholder="เม็ด, แคปซูล, ขวด…"
              className="w-full md:w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400"
            />
            <datalist id="edit-drug-unit-list">
              {DRUG_UNITS.map(u => <option key={u} value={u} />)}
            </datalist>
          </div>
          {/* Row 2: ราคาทุน + ราคาขาย (หน้าร้าน — base) */}
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
          {/* Extra tier prices (regular / wholesale / custom) */}
          <div className="mb-3">
            <div className="text-xs font-medium text-gray-600 mb-2">
              ราคาตามประเภทลูกค้าอื่น ๆ
              <span className="ml-1 text-gray-400 font-normal">(ไม่บังคับ)</span>
            </div>
            <PriceTiersEditor
              unit={form.unit || 'หน่วย'}
              value={priceTiers}
              onChange={setPriceTiers}
            />
          </div>
          {/* Row 3: บาร์โค้ด (ใต้ราคา) */}
          <div className="mb-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">บาร์โค้ด</label>
            <input type="text" value={form.barcode}
              onChange={e => set('barcode', e.target.value)}
              className="w-full md:w-1/2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400" />
          </div>

          {/* ── Sub-block: หน่วยทางเลือก ─────────────────────── */}
          <div className="border-t border-gray-100 mt-5 pt-4">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <span aria-hidden="true">📐</span> หน่วยทางเลือก
              </h3>
              <span className="text-[11px] text-gray-400">เช่น แผง / กล่อง</span>
            </div>
            <AltUnitsEditor
              baseUnit={form.unit || 'หน่วย'}
              value={altUnits}
              onChange={setAltUnits}
            />
          </div>
        </section>

        {/* ── Section: สต็อก (min_stock only — stock edit ผ่าน lot/adjust) ── */}
        <section className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span aria-hidden="true">📦</span> การแจ้งเตือนสต็อก
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">แจ้งเตือนเมื่อสต็อก ≤</label>
              <input type="number" min="0" step="1" value={form.min_stock}
                onChange={e => set('min_stock', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            จำนวนสต็อกจริงจัดการผ่านล็อต / ปรับสต็อก ในหน้าสต็อกยา
          </p>
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

      {/* Sticky footer */}
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
