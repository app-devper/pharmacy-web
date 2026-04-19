import { useState, useEffect } from 'react'
import { useCart } from '../../context/CartContext'
import { createSale } from '../../api/sales'
import { useDrugs } from '../../hooks/useDrugs'
import { useSettings } from '../../context/SettingsContext'
import { useToast } from '../../hooks/useToast'
import CartItemRow from './CartItem'
import CustomerPickerModal from './CustomerPickerModal'
import CartDiscountModal from './CartDiscountModal'
import SingleItemDiscountModal from './SingleItemDiscountModal'
import ParkTabs from './ParkTabs'
import OversellConfirmModal, { type OversellRow } from './OversellConfirmModal'
import type { SaleResponse, CartItem, SaleItemInput } from '../../types/sale'
import type { PriceTier } from '../../types/drug'
import { itemBasePrice } from '../../context/CartContext'
import { getTierLabel } from '../../utils/pricing'
import type { CheckoutData } from './KySaleModal'

interface Props {
  onCheckoutDone: (result: SaleResponse, items: CartItem[], tier: PriceTier) => void
  onReloadDrugs: () => void
  onAddCustomer: () => void
  onKyRequired: (data: CheckoutData) => void
}

export default function Cart({ onCheckoutDone, onReloadDrugs, onAddCustomer, onKyRequired }: Props) {
  const {
    items, changeQty, setItemDiscount, clearCart, total,
    selectedCustomer, setSelectedCustomer,
    priceTier,
    discountInput, discountType, setDiscountInput, setDiscountType,
    activeSlot,
  } = useCart()
  const { drugs, patchStocks } = useDrugs()
  const { settings } = useSettings()
  const showToast = useToast()
  const [received, setReceived] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [showCartDiscount, setShowCartDiscount] = useState(false)
  const [discountItem, setDiscountItem] = useState<CartItem | null>(null)
  // When a checkout needs oversell confirmation, pause and show the modal.
  // On confirm we re-invoke the same checkout path with `allow_oversell:true`
  // attached to the flagged lines.
  const [oversellPending, setOversellPending] = useState<OversellRow[] | null>(null)

  // Reset received amount when switching park slots or cart is cleared
  useEffect(() => { setReceived('') }, [activeSlot])
  useEffect(() => { if (items.length === 0) setReceived('') }, [items.length])

  // discount calculations
  // total (from context) = grossSubtotal - totalItemDiscount (effective subtotal)
  // All per-unit values are in BASE units resolved at the current tier.
  const grossSubtotal = items.reduce((s, i) => s + itemBasePrice(i, priceTier) * i.qty, 0)
  const totalItemDiscount = items.reduce((s, i) => s + (i.itemDiscount || 0) * i.qty, 0)
  const discountValue = parseFloat(discountInput) || 0
  const cartDiscountAmt = discountType === '%'
    ? Math.min(total * discountValue / 100, total)
    : Math.min(discountValue, total)
  const netTotal = total - cartDiscountAmt
  const totalDiscount = totalItemDiscount + cartDiscountAmt
  const hasAnyDiscount = totalDiscount > 0

  const handleCheckout = async () => {
    if (items.length === 0) { showToast('ตะกร้าว่างเปล่า', 'error'); return }
    if (!received.trim()) { showToast('กรุณาระบุจำนวนเงินที่รับ', 'error'); return }
    const recv = parseFloat(received)
    if (!Number.isFinite(recv)) { showToast('จำนวนเงินที่รับไม่ถูกต้อง', 'error'); return }
    if (recv < netTotal) { showToast('จำนวนเงินที่รับน้อยกว่ายอดสุทธิ', 'error'); return }
    const saleItems = items.map(i => {
      // Everything here is per BASE unit resolved at the cart's current tier.
      // Backend revalidates against drug.prices so the client can't spoof.
      const original = itemBasePrice(i, priceTier)
      const itemDisc = i.itemDiscount || 0
      const unit = i.selected_unit ?? ''
      const factor = i.selected_unit_factor ?? 1
      // Capture a FEFO snapshot when the drug list has decorated this item
      // with next_lot. Read from the live `drugs` cache so a drug that just
      // got a new lot via another path picks it up. When the sale runs (or
      // later syncs, for offline bills), the backend compares this against
      // whichever lot FEFO actually deducts from and sets lot_mismatch=true
      // if they differ — useful for pharmacy audit trails on queued bills.
      const live = drugs.find(d => d.id === i.id)
      const snapshot = live?.next_lot
        ? {
            lot_id:      live.next_lot.lot_id,
            lot_number:  live.next_lot.lot_number,
            expiry_date: live.next_lot.expiry_date,
          }
        : undefined
      return {
        drug_id: i.id,
        qty: i.qty,
        price: Math.max(0, original - itemDisc),
        original_price: original,
        item_discount: itemDisc,
        price_tier: priceTier,
        ...(unit ? { unit, unit_factor: factor } : {}),
        ...(snapshot ? { lot_snapshot: snapshot } : {}),
      }
    })

    // Detect oversold lines — anything in the cart where the requested base
    // qty exceeds the drug's local stock. We aggregate per drug (a cart may
    // hold the same drug under multiple alt-units) and prompt once.
    const shortByDrug = new Map<string, number>()
    for (const si of saleItems) {
      const d = drugs.find(x => x.id === si.drug_id)
      const stock = d?.stock ?? 0
      shortByDrug.set(si.drug_id, (shortByDrug.get(si.drug_id) ?? 0) + si.qty)
      void stock // lint
    }
    const oversoldRows: OversellRow[] = []
    for (const [drugId, need] of shortByDrug) {
      const d = drugs.find(x => x.id === drugId)
      const stock = d?.stock ?? 0
      if (need > Math.max(0, stock)) {
        // Surface the first cart item's unit metadata for friendlier copy.
        const firstItem = items.find(i => i.id === drugId)
        oversoldRows.push({
          drug_id: drugId,
          drug_name: d?.name ?? firstItem?.name ?? drugId,
          need,
          available: stock,
          unit: firstItem?.selected_unit,
          unit_factor: firstItem?.selected_unit_factor,
        })
      }
    }
    if (oversoldRows.length > 0) {
      // Pause checkout — modal takes over. Store context + tag the flagged
      // lines with allow_oversell; runCheckout will pick up from here.
      setOversellPending(oversoldRows)
      return
    }

    await runCheckout(saleItems, recv)
  }

  // Extracted from handleCheckout so the oversell confirm flow can re-enter
  // with the same payload after attaching allow_oversell flags. `recv` is
  // passed explicitly (not re-parsed) to lock the received amount the user
  // already approved.
  const runCheckout = async (
    saleItems: SaleItemInput[],
    recv: number,
  ) => {
    // Check if any items need KY forms. If the shop opted out of compliance
    // recording (Settings → ขย. → ข้ามบันทึก), skip the modal and go straight
    // to the normal sale flow.
    const needsKy = !settings.ky.skip_auto
      && items.some(i => i.report_types?.some(t => ['ky10', 'ky11', 'ky12'].includes(t)))
    if (needsKy) {
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

    // Normal checkout
    setLoading(true)
    try {
      // Snapshot the cart state BEFORE clearing — ReceiptModal needs the tier
      // at checkout time, not whatever the cart resets to afterwards.
      const snapshotItems = [...items]
      const tierAtCheckout = priceTier
      // Pre-compute optimistic stock deltas from the local drug cache. Used
      // ONLY when the server doesn't return authoritative `stock_updates`
      // (i.e. offline path). Sum qty × factor per drug → subtract from current
      // local stock. Clamped to 0 so late-arriving offline sales don't render
      // negative counts.
      const offlinePatches = (() => {
        const byDrug = new Map<string, number>()
        for (const it of saleItems) {
          const base = it.qty * (it.unit_factor ?? 1)
          byDrug.set(it.drug_id, (byDrug.get(it.drug_id) ?? 0) + base)
        }
        const out: { drug_id: string; new_stock: number }[] = []
        for (const [id, used] of byDrug) {
          const d = drugs.find(x => x.id === id)
          if (!d) continue
          out.push({ drug_id: id, new_stock: Math.max(0, d.stock - used) })
        }
        return out
      })()

      const result = await createSale({
        items: saleItems,
        discount: cartDiscountAmt || undefined,
        received: recv,
        customer_id: selectedCustomer?.id,
      })
      clearCart()
      setReceived('')
      // Stock reconciliation:
      //   • Online → server returns `stock_updates` (authoritative).
      //   • Offline → no server response; apply optimistic patches so the UI
      //     reflects the sale immediately. Real values get reconciled when
      //     the queue syncs (useOfflineSync → onReloadDrugs there, or the
      //     user returns to the page).
      if (result.stock_updates && result.stock_updates.length > 0) {
        patchStocks(result.stock_updates)
      } else if (!navigator.onLine) {
        patchStocks(offlinePatches)
      } else {
        onReloadDrugs()
      }
      onCheckoutDone(result, snapshotItems, tierAtCheckout)
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
    <div className="flex border-l border-gray-200">
      <div className="w-72 bg-white flex flex-col">
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
          rows={oversellPending}
          onCancel={() => setOversellPending(null)}
          onConfirm={() => {
            // Rebuild the sale items with allow_oversell toggled on for any
            // line whose drug shows up in the pending rows. Re-reading the
            // live cart here keeps qty/discount edits that might have
            // happened while the modal was open (edge case).
            const overDrugs = new Set(oversellPending.map(r => r.drug_id))
            const rebuilt: SaleItemInput[] = items.map(i => {
              const original = itemBasePrice(i, priceTier)
              const itemDisc = i.itemDiscount || 0
              const unit = i.selected_unit ?? ''
              const factor = i.selected_unit_factor ?? 1
              const live = drugs.find(d => d.id === i.id)
              const snapshot = live?.next_lot
                ? {
                    lot_id:      live.next_lot.lot_id,
                    lot_number:  live.next_lot.lot_number,
                    expiry_date: live.next_lot.expiry_date,
                  }
                : undefined
              return {
                drug_id: i.id,
                qty: i.qty,
                price: Math.max(0, original - itemDisc),
                original_price: original,
                item_discount: itemDisc,
                price_tier: priceTier,
                ...(unit ? { unit, unit_factor: factor } : {}),
                ...(snapshot ? { lot_snapshot: snapshot } : {}),
                ...(overDrugs.has(i.id) ? { allow_oversell: true } : {}),
              }
            })
            setOversellPending(null)
            const recv = parseFloat(received) || 0
            runCheckout(rebuilt, recv)
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
      <ParkTabs />
    </div>
  )
}
