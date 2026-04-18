import { useState } from 'react'
import { createSale } from '../../api/sales'
import { addKy10, addKy11, addKy12 } from '../../api/kyforms'
import { useCart } from '../../context/CartContext'
import { useSettings } from '../../context/SettingsContext'
import { useToast } from '../../hooks/useToast'
import { getDrugSellPrice } from '../../types/drug'
import type { CartItem, SaleItemInput, SaleResponse } from '../../types/sale'
import type { Customer } from '../../types/customer'

export interface CheckoutData {
  cartItems: CartItem[]
  saleItems: SaleItemInput[]
  discountAmt: number
  received: number
  customer_id?: string
  selectedCustomer: Customer | null
  netTotal: number
}

interface Props {
  data: CheckoutData
  onDone: (result: SaleResponse, items: CartItem[]) => void
  onCancel: () => void
}

const today = new Date().toISOString().split('T')[0]

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
  const { clearCart, setSelectedCustomer } = useCart()
  const { settings } = useSettings()
  const showToast = useToast()
  const [saving, setSaving] = useState(false)

  // Detect which forms are needed
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
    balance: '0',
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

  const doCheckout = async (withKy: boolean) => {
    setSaving(true)
    try {
      // 1. Create sale
      const result = await createSale({
        items: data.saleItems,
        discount: data.discountAmt || undefined,
        received: data.received,
        customer_id: data.customer_id,
      })

      // 2. Create KY records (if not skipped)
      if (withKy) {
        const date = today
        const kyErrors: string[] = []

        for (const item of ky10Items) {
          try {
            await addKy10({
              date,
              drug_name: item.name,
              reg_no: item.reg_no ?? '',
              unit: item.unit ?? 'เม็ด',
              qty: item.qty,
              buyer_name: f10.buyer_name,
              buyer_address: f10.buyer_address,
              rx_no: f10.rx_no,
              doctor: f10.doctor,
              balance: parseInt(f10.balance) || 0,
            })
          } catch { kyErrors.push(`ขย.10: ${item.name}`) }
        }

        for (const item of ky11Items) {
          try {
            await addKy11({
              date,
              drug_name: item.name,
              reg_no: item.reg_no ?? '',
              unit: item.unit ?? 'เม็ด',
              qty: item.qty,
              buyer_name: f11.buyer_name,
              purpose: f11.purpose,
              pharmacist: f11.pharmacist,
            })
          } catch { kyErrors.push(`ขย.11: ${item.name}`) }
        }

        for (const item of ky12Items) {
          try {
            await addKy12({
              date,
              drug_name: item.name,
              qty: item.qty,
              unit: item.unit ?? 'เม็ด',
              rx_no: f12.rx_no,
              patient_name: f12.patient_name,
              doctor: f12.doctor,
              hospital: f12.hospital,
              total_value: getDrugSellPrice(item) * item.qty,
              status: f12.status,
            })
          } catch { kyErrors.push(`ขย.12: ${item.name}`) }
        }

        if (kyErrors.length > 0) {
          showToast(`บิล #${result.bill_no} บันทึกแล้ว แต่บันทึก ขย. ไม่ครบ (${kyErrors.join(', ')}) — กรุณากรอกเพิ่มเองใน ขย. โดยตรง`, 'error')
        }
      }

      // 3. Cleanup cart
      clearCart()
      setSelectedCustomer(null)
      onDone(result, data.cartItems)
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
                <Field label="วัตถุประสงค์">
                  <input className={inp} value={f11.purpose} onChange={e => upd11('purpose', e.target.value)} />
                </Field>
                <Field label="เภสัชกร">
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
                  <Field label="ที่อยู่">
                    <input className={inp} value={f10.buyer_address} onChange={e => upd10('buyer_address', e.target.value)} />
                  </Field>
                </div>
                <Field label="เลขที่ใบสั่ง">
                  <input className={inp} value={f10.rx_no} onChange={e => upd10('rx_no', e.target.value)} />
                </Field>
                <Field label="แพทย์ผู้สั่ง">
                  <input className={inp} value={f10.doctor} onChange={e => upd10('doctor', e.target.value)} />
                </Field>
                <Field label="คงเหลือ">
                  <input type="number" className={inp} value={f10.balance} onChange={e => upd10('balance', e.target.value)} />
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
                <Field label="แพทย์">
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
            {saving ? 'กำลังบันทึก...' : '✓ บันทึกและออกใบเสร็จ'}
          </button>
        </div>
      </div>
    </div>
  )
}
