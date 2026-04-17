import { useState, useEffect } from 'react'
import { useCart } from '../../context/CartContext'
import { createSale } from '../../api/sales'
import { useToast } from '../../hooks/useToast'
import CartItemRow from './CartItem'
import CustomerPickerModal from './CustomerPickerModal'
import CartDiscountModal from './CartDiscountModal'
import SingleItemDiscountModal from './SingleItemDiscountModal'
import ParkTabs from './ParkTabs'
import type { SaleResponse, CartItem } from '../../types/sale'
import { getDrugSellPrice } from '../../types/drug'
import type { CheckoutData } from './KySaleModal'

interface Props {
  onCheckoutDone: (result: SaleResponse, items: CartItem[]) => void
  onReloadDrugs: () => void
  onAddCustomer: () => void
  onKyRequired: (data: CheckoutData) => void
}

export default function Cart({ onCheckoutDone, onReloadDrugs, onAddCustomer, onKyRequired }: Props) {
  const {
    items, changeQty, setItemDiscount, clearCart, total,
    selectedCustomer, setSelectedCustomer,
    discountInput, discountType, setDiscountInput, setDiscountType,
    activeSlot,
  } = useCart()
  const showToast = useToast()
  const [received, setReceived] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [showCartDiscount, setShowCartDiscount] = useState(false)
  const [discountItem, setDiscountItem] = useState<CartItem | null>(null)

  // Reset received amount when switching park slots
  useEffect(() => { setReceived('') }, [activeSlot])

  // discount calculations
  // total (from context) = grossSubtotal - totalItemDiscount (effective subtotal)
  const grossSubtotal = items.reduce((s, i) => s + getDrugSellPrice(i) * i.qty, 0)
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
    const saleItems = items.map(i => ({
      drug_id: i.id,
      qty: i.qty,
      price: Math.max(0, getDrugSellPrice(i) - (i.itemDiscount || 0)),
    }))

    // Check if any items need KY forms
    const needsKy = items.some(i => i.report_types?.some(t => ['ky10', 'ky11', 'ky12'].includes(t)))
    if (needsKy) {
      onKyRequired({
        cartItems: [...items],
        saleItems,
        discountAmt: cartDiscountAmt,
        received: recv,
        customer_id: selectedCustomer?.id,
        selectedCustomer,
        netTotal,
      })
      return
    }

    // Normal checkout
    setLoading(true)
    try {
      const result = await createSale({
        items: saleItems,
        discount: cartDiscountAmt || undefined,
        received: recv,
        customer_id: selectedCustomer?.id,
      })
      clearCart()
      setReceived('')
      onReloadDrugs()
      onCheckoutDone(result, [...items])
    } catch (e: unknown) {
      showToast((e as Error).message || 'เกิดข้อผิดพลาด', 'error')
    } finally {
      setLoading(false)
    }
  }

  const recvNum = parseFloat(received) || 0
  const change = Math.max(0, recvNum - netTotal)
  const hasAllergy = selectedCustomer?.disease &&
    selectedCustomer.disease !== '-' && selectedCustomer.disease !== ''

  return (
    <div className="flex border-l border-gray-200">
      <div className="w-72 bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">ตะกร้า</h2>
      </div>

      {/* Customer selector */}
      <div className="px-4 pt-3 pb-2 border-b border-gray-100">
        {!selectedCustomer ? (
          <button
            onClick={() => setShowPicker(true)}
            className="w-full flex items-center gap-2 border border-dashed border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
          >
            <span>👤</span>
            <span>เลือกลูกค้า</span>
          </button>
        ) : (
          <div>
            <div
              className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-1.5 cursor-pointer hover:bg-blue-100 transition-colors"
              onClick={() => setShowPicker(true)}
            >
              <span className="text-sm">👤</span>
              <span className="text-sm font-medium text-blue-800 flex-1 truncate">{selectedCustomer.name}</span>
              <button
                onClick={e => { e.stopPropagation(); setSelectedCustomer(null) }}
                className="text-blue-400 hover:text-blue-600 text-lg leading-none"
              >×</button>
            </div>
            {hasAllergy && (
              <div className="mt-1.5 flex gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 text-xs text-amber-700">
                <span className="shrink-0">⚠</span>
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

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4">
        {items.length === 0
          ? <div className="text-center text-gray-400 text-sm py-8">ยังไม่มีรายการ</div>
          : items.map(item => (
              <CartItemRow key={item.id} item={item} onChangeQty={changeQty} onDiscount={setDiscountItem} />
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
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-dashed border-gray-200 hover:border-rose-300 hover:bg-rose-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="text-sm text-gray-500">ส่วนลดรวม</span>
          {cartDiscountAmt > 0
            ? <span className="text-sm font-medium text-rose-500">
                -฿{cartDiscountAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })} ✏
              </span>
            : <span className="text-xs text-blue-400">+ เพิ่ม</span>
          }
        </button>

        {/* ยอดสุทธิ */}
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-semibold text-gray-700">ยอดสุทธิ</span>
          <span className={`font-bold text-lg ${hasAnyDiscount ? 'text-blue-600' : 'text-gray-800'}`}>
            ฿{netTotal.toLocaleString()}
          </span>
        </div>

        {/* รับเงิน */}
        <input
          type="number"
          placeholder="รับเงิน (฿) * — F2"
          value={received}
          onChange={e => setReceived(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCheckout()}
          data-shortcut="received"
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors ${
            received.trim()
              ? 'border-gray-200 focus:border-blue-400'
              : 'border-orange-300 bg-orange-50 focus:border-orange-400'
          }`}
        />

        {/* ทอน */}
        {received && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>ทอน</span>
            <span className="font-semibold">฿{change.toLocaleString()}</span>
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading || items.length === 0 || !received.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          {loading ? 'กำลังบันทึก...' : 'ออกใบเสร็จ'}
        </button>
      </div>
      </div>
      <ParkTabs />
    </div>
  )
}
