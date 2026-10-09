import { useState } from 'react'
import { useCheckout } from '../../hooks/useCheckout'
import { kyFormsNeeded, missingKyFields } from '../../lib/checkout'
import { useCart } from '../../context/CartContext'
import { useSettings } from '../../context/SettingsContext'
import { useToast } from '../../hooks/useToast'
import type { CartItem, SaleItemInput, SaleKyCapture, SaleResponse } from '../../types/sale'
import type { Customer } from '../../types/customer'
import type { PriceTier } from '../../types/drug'

export interface CheckoutData {
  cartItems: CartItem[]
  saleItems: SaleItemInput[]
  discountAmt: number
  received: number
  customer_id?: string
  selectedCustomer: Customer | null
  netTotal: number
  priceTier: PriceTier
}

interface Props {
  data: CheckoutData
  onDone: (result: SaleResponse, items: CartItem[], tier: PriceTier) => void
  onCancel: () => void
}

const KY_LABELS: Record<string, { label: string; color: string }> = {
  ky10: { label: 'ขย.10 ยาควบคุมพิเศษ', color: 'bg-purple-100 text-purple-700' },
  ky11: { label: 'ขย.11 ยาอันตราย',      color: 'bg-red-100 text-red-700' },
  ky12: { label: 'ขย.12 ใบสั่งแพทย์',   color: 'bg-teal-100 text-teal-700' },
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-0.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inp = 'w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-400'

export default function KySaleModal({ data, onDone, onCancel }: Props) {
  const { setSelectedCustomer } = useCart()
  const { submit } = useCheckout()
  const { settings } = useSettings()
  const showToast = useToast()
  const [saving, setSaving] = useState(false)

  // The forms this sale needs (checkout decides; the modal only opens when
  // the shop records KY).
  const forms = kyFormsNeeded(data.cartItems, false)
  const ky10Items = data.cartItems.filter(i => i.report_types?.includes('ky10'))
  const ky11Items = data.cartItems.filter(i => i.report_types?.includes('ky11'))
  const ky12Items = data.cartItems.filter(i => i.report_types?.includes('ky12'))

  const prefillName = data.selectedCustomer?.name ?? ''

  // ขย.10 form state — address defaults from Settings → ขย. → "ที่อยู่ผู้ซื้อเริ่มต้น"
  const [f10, setF10] = useState({
    buyer_name: prefillName,
    buyer_address: settings.ky.default_buyer_address,
    rx_no: '',
    doctor: '',
  })

  // ขย.11 form state — pharmacist auto-fills from Settings → เภสัชกร
  const [f11, setF11] = useState({
    buyer_name: prefillName,
    purpose: '',
    pharmacist: settings.pharmacist.name,
  })

  // ขย.12 form state
  const [f12, setF12] = useState({
    rx_no: '', patient_name: prefillName, doctor: '', hospital: '', status: 'จ่ายแล้ว',
  })

  const upd10 = (k: keyof typeof f10, v: string) => setF10(s => ({ ...s, [k]: v }))
  const upd11 = (k: keyof typeof f11, v: string) => setF11(s => ({ ...s, [k]: v }))
  const upd12 = (k: keyof typeof f12, v: string) => setF12(s => ({ ...s, [k]: v }))

  /**
   * What the cashier captured. pharmacy-api records the forms with the bill
   * and fills drug, quantity, unit, value, date and ขย.10 balance from it.
   */
  const buildCapture = (): SaleKyCapture => ({
    ...(ky10Items.length > 0 ? { ky10: f10 } : {}),
    ...(ky11Items.length > 0 ? { ky11: f11 } : {}),
    ...(ky12Items.length > 0 ? { ky12: f12 } : {}),
  })

  const doCheckout = async (withKy: boolean) => {
    const capture = withKy ? buildCapture() : undefined
    const missing = capture ? missingKyFields(capture, forms) : []
    if (missing.length > 0) {
      showToast(`กรุณากรอกข้อมูลที่จำเป็น: ${missing.join(', ')}`, 'error')
      return
    }
    setSaving(true)
    try {
      // The bill and its KY records go together: if the bill is queued, or
      // the connection drops before the records are sent, they wait in the
      // offline queue with the bill.
      const result = await submit({
        items: data.saleItems,
        discount: data.discountAmt || undefined,
        received: data.received,
        customer_id: data.customer_id,
        ky_skipped_by_cashier: withKy ? undefined : true,
        ky: capture,
      })
      setSelectedCustomer(null)
      onDone(result, data.cartItems, data.priceTier)
    } catch (e: unknown) {
      showToast((e as Error).message || 'เกิดข้อผิดพลาด', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-800">ข้อมูลแบบฟอร์ม ขย.</h2>
            <p className="text-xs text-gray-400 mt-0.5">กรอกข้อมูลเพิ่มเติมสำหรับยาที่ต้องบันทึก</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Drug chips */}
        <div className="px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="text-xs text-gray-500 mb-1.5">รายการยาที่ต้องบันทึก</div>
          <div className="flex flex-wrap gap-1.5">
            {data.cartItems
              .filter(i => i.report_types?.some(t => ['ky10','ky11','ky12'].includes(t)))
              .map(i => (
                <div key={i.id} className="flex items-center gap-1 border border-gray-200 rounded-full px-2.5 py-0.5">
                  <span className="text-xs font-medium text-gray-700">{i.name}</span>
                  <div className="flex gap-1">
                    {(['ky10','ky11','ky12'] as const)
                      .filter(t => i.report_types?.includes(t))
                      .map(t => (
                        <span key={t} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${KY_LABELS[t].color}`}>
                          {t === 'ky10' ? '10' : t === 'ky11' ? '11' : '12'}
                        </span>
                      ))
                    }
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Form sections */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* ขย.11 */}
          {ky11Items.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">ขย.11</span>
                <span className="text-xs text-gray-500">ยาอันตราย — {ky11Items.map(i => i.name).join(', ')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Field label="ชื่อผู้รับ" required>
                    <input className={inp} value={f11.buyer_name} onChange={e => upd11('buyer_name', e.target.value)} />
                  </Field>
                </div>
                <Field label="วัตถุประสงค์" required>
                  <input className={inp} value={f11.purpose} onChange={e => upd11('purpose', e.target.value)} />
                </Field>
                <Field label="เภสัชกร" required>
                  <input className={inp} value={f11.pharmacist} onChange={e => upd11('pharmacist', e.target.value)} />
                </Field>
              </div>
            </section>
          )}

          {/* ขย.10 */}
          {ky10Items.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">ขย.10</span>
                <span className="text-xs text-gray-500">ยาควบคุมพิเศษ — {ky10Items.map(i => i.name).join(', ')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Field label="ชื่อผู้ซื้อ" required>
                    <input className={inp} value={f10.buyer_name} onChange={e => upd10('buyer_name', e.target.value)} />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="ที่อยู่" required>
                    <input className={inp} value={f10.buyer_address} onChange={e => upd10('buyer_address', e.target.value)} />
                  </Field>
                </div>
                <Field label="เลขที่ใบสั่ง">
                  <input className={inp} value={f10.rx_no} onChange={e => upd10('rx_no', e.target.value)} />
                </Field>
                <Field label="แพทย์ผู้สั่ง">
                  <input className={inp} value={f10.doctor} onChange={e => upd10('doctor', e.target.value)} />
                </Field>
              </div>
            </section>
          )}

          {/* ขย.12 */}
          {ky12Items.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">ขย.12</span>
                <span className="text-xs text-gray-500">ใบสั่งแพทย์ — {ky12Items.map(i => i.name).join(', ')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="เลขที่ใบสั่ง" required>
                  <input className={inp} value={f12.rx_no} onChange={e => upd12('rx_no', e.target.value)} />
                </Field>
                <Field label="ชื่อผู้ป่วย" required>
                  <input className={inp} value={f12.patient_name} onChange={e => upd12('patient_name', e.target.value)} />
                </Field>
                <Field label="แพทย์" required>
                  <input className={inp} value={f12.doctor} onChange={e => upd12('doctor', e.target.value)} />
                </Field>
                <Field label="สถานพยาบาล">
                  <input className={inp} value={f12.hospital} onChange={e => upd12('hospital', e.target.value)} />
                </Field>
                <div className="col-span-2">
                  <Field label="สถานะ">
                    <input className={inp} value={f12.status} onChange={e => upd12('status', e.target.value)} />
                  </Field>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 flex gap-2 shrink-0">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm text-gray-600 transition-colors"
          >
            ยกเลิก
          </button>
          <div className="flex-1" />
          <button
            onClick={() => doCheckout(false)}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-600 transition-colors disabled:opacity-50"
          >
            ข้ามขั้นตอนนี้
          </button>
          <button
            onClick={() => doCheckout(true)}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm text-white font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก…' : '✓ บันทึกและออกใบเสร็จ'}
          </button>
        </div>
      </div>
    </div>
  )
}
