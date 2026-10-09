import { useState, useEffect } from 'react'
import { useCart } from '../../context/CartContext'
import { useCheckout } from '../../hooks/useCheckout'
import { kyFormsNeeded, oversoldLines, saleItemsOf, totalsOf } from '../../lib/checkout'
import { useDrugs } from '../../hooks/useDrugs'
import { useSettings } from '../../context/SettingsContext'
import { useToast } from '../../hooks/useToast'
import CartItemRow from './CartItem'
import CustomerPickerModal from './CustomerPickerModal'
import CartDiscountModal from './CartDiscountModal'
import SingleItemDiscountModal from './SingleItemDiscountModal'
import ParkTabs from './ParkTabs'
import OversellConfirmModal, { type OversellRow } from './OversellConfirmModal'
import type { SaleResponse, CartItem } from '../../types/sale'
import type { PriceTier } from '../../types/drug'
import { getTierLabel } from '../../utils/pricing'
import type { CheckoutData } from './KySaleModal'

interface Props {
  onCheckoutDone: (result: SaleResponse, items: CartItem[], tier: PriceTier) => void
  onAddCustomer: () => void
  onKyRequired: (data: CheckoutData) => void
}

export default function Cart({ onCheckoutDone, onAddCustomer, onKyRequired }: Props) {
  const {
    items, changeQty, setItemDiscount, total,
    selectedCustomer, setSelectedCustomer,
    priceTier,
    discountInput, discountType, setDiscountInput, setDiscountType,
    activeSlot,
  } = useCart()
  const { drugs } = useDrugs()
  const { submit } = useCheckout()
  const { settings } = useSettings()
  const showToast = useToast()
  const [received, setReceived] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [showCartDiscount, setShowCartDiscount] = useState(false)
  const [discountItem, setDiscountItem] = useState<CartItem | null>(null)
  // When the cart sells more than is on hand, checkout pauses for the
  // oversell confirmation, holding the received amount the cashier entered.
  const [oversellPending, setOversellPending] = useState<{ rows: OversellRow[]; recv: number } | null>(null)

  // Reset received amount when switching park slots or cart is cleared
  useEffect(() => { setReceived('') }, [activeSlot])
  useEffect(() => { if (items.length === 0) setReceived('') }, [items.length])

  const { gross: grossSubtotal, itemDiscount: totalItemDiscount, cartDiscount: cartDiscountAmt, net: netTotal } =
    totalsOf(items, priceTier, discountInput, discountType)
  const totalDiscount = totalItemDiscount + cartDiscountAmt
  const hasAnyDiscount = totalDiscount > 0

  const handleCheckout = async () => {
    if (items.length === 0) { showToast('ตะกร้าว่างเปล่า', 'error'); return }
    if (!received.trim()) { showToast('กรุณาระบุจำนวนเงินที่รับ', 'error'); return }
    const recv = parseFloat(received)
    if (!Number.isFinite(recv)) { showToast('จำนวนเงินที่รับไม่ถูกต้อง', 'error'); return }
    if (recv < netTotal) { showToast('จำนวนเงินที่รับน้อยกว่ายอดสุทธิ', 'error'); return }
    const oversold = oversoldLines(items, drugs)
    if (oversold.length > 0) {
      setOversellPending({ rows: oversold, recv })
      return
    }
    await runCheckout(new Set(), recv)
  }

  // allowOversell names the drugs the cashier confirmed selling short.
  const runCheckout = async (allowOversell: ReadonlySet<string>, recv: number) => {
    const saleItems = saleItemsOf(items, priceTier, drugs, allowOversell)
    if (kyFormsNeeded(items, settings.ky.skip_auto).length > 0) {
      onKyRequired({
        cartItems: [...items],
        saleItems,
        discountAmt: cartDiscountAmt,
        received: recv,
        customer_id: selectedCustomer?.id,
        selectedCustomer,
        netTotal,
        priceTier,
      })
      return
    }
    setLoading(true)
    try {
      // The receipt shows the cart as it was, at the tier it was sold at.
      const soldItems = [...items]
      const soldTier = priceTier
      const result = await submit({
        items: saleItems,
        discount: cartDiscountAmt || undefined,
        received: recv,
        customer_id: selectedCustomer?.id,
      })
      setReceived('')
      onCheckoutDone(result, soldItems, soldTier)
    } catch (e: unknown) {
      showToast((e as Error).message || 'เกิดข้อผิดพลาด', 'error')
    } finally {
      setLoading(false)
    }
  }

  const recvNum = parseFloat(received) || 0
  const change = Math.max(0, recvNum - netTotal)

  // Quick-cash chips: exact + next-higher 100/500/1000, deduped, max 4 chips.
  const quickAmounts = (() => {
    if (netTotal <= 0) return [] as number[]
    const exact = Math.round(netTotal * 100) / 100
    const up = (step: number) => Math.ceil(netTotal / step) * step
    const set = new Set<number>([exact])
    for (const n of [up(100), up(500), up(1000)]) {
      if (n > exact) set.add(n)
    }
    return Array.from(set).slice(0, 4)
  })()
  const hasAllergy = selectedCustomer?.disease &&
    selectedCustomer.disease !== '-' && selectedCustomer.disease !== ''

  return (
    <div className="flex h-full border-l border-gray-200">
      <div className="w-[85vw] max-w-[22rem] md:w-72 bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">ตะกร้า</h2>
      </div>

      {/* Read-only tier indicator — shown only when the selected customer
          pulls in a non-retail default. The tier is set by the customer and
          cannot be overridden per-cart. */}
      {priceTier !== 'retail' && (
        <div className="px-4 pt-2 pb-2 border-b border-gray-100 text-xs text-indigo-600 flex items-center gap-1.5">
          <span aria-hidden="true">💰</span>
          <span>ใช้ราคา <span className="font-semibold">{getTierLabel(priceTier)}</span> ตามลูกค้า</span>
        </div>
      )}

      {/* Customer selector */}
      <div className="px-2 pt-2 pb-2 border-b border-gray-100">
        {!selectedCustomer ? (
          <button
            onClick={() => setShowPicker(true)}
            aria-label="เลือกลูกค้า"
            className="w-full min-h-[36px] flex items-center gap-2 px-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <span aria-hidden="true">👤</span>
            <span className="flex-1 text-left">เลือกลูกค้า</span>
            <span className="text-gray-400 text-base leading-none" aria-hidden="true">›</span>
          </button>
        ) : (
          <div>
            <div className="min-h-[36px] flex items-center gap-2 px-2">
              <span aria-hidden="true">👤</span>
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="flex-1 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
              >
                <div className="text-sm font-medium text-gray-800 truncate">{selectedCustomer.name}</div>
                {selectedCustomer.phone && (
                  <div className="text-[11px] text-gray-400 truncate">{selectedCustomer.phone}</div>
                )}
              </button>
              <button
                type="button"
                aria-label="ลบลูกค้า"
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-red-500 text-lg leading-none px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 rounded"
              >×</button>
            </div>
            {hasAllergy && (
              <div className="mt-1.5 flex gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 text-xs text-amber-700">
                <span className="shrink-0" aria-hidden="true">⚠</span>
                <span>{selectedCustomer.disease}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showPicker && (
        <CustomerPickerModal
          onSelect={c => { setSelectedCustomer(c); setShowPicker(false) }}
          onAddNew={() => { setShowPicker(false); onAddCustomer() }}
          onClose={() => setShowPicker(false)}
        />
      )}
      {discountItem && (
        <SingleItemDiscountModal
          item={discountItem}
          onConfirm={setItemDiscount}
          onClose={() => setDiscountItem(null)}
        />
      )}
      {showCartDiscount && (
        <CartDiscountModal
          subtotal={total}
          cartDiscount={discountInput}
          cartDiscountType={discountType}
          onSetCartDiscount={setDiscountInput}
          onSetCartDiscountType={setDiscountType}
          onClose={() => setShowCartDiscount(false)}
        />
      )}
      {oversellPending && (
        <OversellConfirmModal
          rows={oversellPending.rows}
          onCancel={() => setOversellPending(null)}
          onConfirm={() => {
            const { rows, recv } = oversellPending
            setOversellPending(null)
            runCheckout(new Set(rows.map(r => r.drug_id)), recv)
          }}
        />
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4">
        {items.length === 0
          ? <div className="text-center text-gray-400 text-sm py-8">ยังไม่มีรายการ</div>
          : items.map(item => (
              <CartItemRow
                key={`${item.id}::${item.selected_unit ?? ''}`}
                item={item}
                onChangeQty={changeQty}
                onDiscount={setDiscountItem}
              />
            ))
        }
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 space-y-2">

        {/* ยอดย่อย */}
        {hasAnyDiscount && (
          <div className="flex justify-between text-sm text-gray-400">
            <span>ยอดย่อย</span>
            <span>฿{grossSubtotal.toLocaleString()}</span>
          </div>
        )}

        {/* ปุ่มส่วนลดรวม */}
        <button
          onClick={() => setShowCartDiscount(true)}
          disabled={items.length === 0}
          className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-rose-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
        >
          <span className="text-sm text-gray-500">ส่วนลดรวม</span>
          {cartDiscountAmt > 0
            ? <span className="text-sm font-medium text-rose-500">
                -฿{cartDiscountAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })} ✏
              </span>
            : <span className="text-xs text-gray-400">+ เพิ่ม</span>
          }
        </button>

        <div className="border-t border-gray-100" />

        {/* ยอดสุทธิ */}
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-semibold text-gray-700">ยอดสุทธิ</span>
          <span className={`font-bold text-lg ${hasAnyDiscount ? 'text-blue-600' : 'text-gray-800'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
            ฿{netTotal.toLocaleString()}
          </span>
        </div>

        {/* Quick-cash chips */}
        {quickAmounts.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            {quickAmounts.map((amt, i) => {
              const active = recvNum === amt
              return (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setReceived(String(amt))}
                  className={`text-xs font-medium py-1.5 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                    active
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  ฿{amt.toLocaleString()}
                  {i === 0 && <span className="ml-1 text-[10px] text-gray-400">พอดี</span>}
                </button>
              )
            })}
          </div>
        )}

        {/* รับเงิน */}
        <input
          type="number"
          name="received"
          autoComplete="off"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="รับเงิน (฿) * — F2"
          value={received}
          onChange={e => setReceived(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCheckout()}
          data-shortcut="received"
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition-colors ${
            received.trim()
              ? 'border-gray-200 focus:border-blue-400'
              : 'border-orange-300 bg-orange-50 focus:border-orange-400'
          }`}
        />

        {/* ทอน */}
        {received && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>ทอน</span>
            <span className="font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>฿{change.toLocaleString()}</span>
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading || items.length === 0 || !received.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          {loading ? 'กำลังบันทึก…' : 'ออกใบเสร็จ'}
        </button>
      </div>
      </div>
      {/* ParkTabs tucked to the right at every breakpoint — parked-cart
          switcher is a core workflow that should be reachable on phone too. */}
      <ParkTabs />
    </div>
  )
}
