import { useState } from 'react'
import type { CartItem } from '../../types/sale'
import { itemBasePrice, useCart } from '../../context/CartContext'

interface Props {
  item: CartItem
  /** discount is per DISPLAY unit (matches what the user sees/types). */
  onConfirm: (id: string, unit: string, discount: number) => void
  onClose: () => void
}

export default function SingleItemDiscountModal({ item, onConfirm, onClose }: Props) {
  const { priceTier } = useCart()
  const unit = item.selected_unit ?? ''
  const factor = item.selected_unit_factor ?? 1
  // Use the cart's current tier for both display + cap calculation so the
  // max-discount guard matches the actual price the customer sees.
  const displayPrice = itemBasePrice(item, priceTier) * factor
  const displayUnit = unit || item.unit
  const displayQty = Math.floor(item.qty / factor)
  const currentDisplayDiscount = (item.itemDiscount || 0) * factor

  const [discount, setDiscount] = useState(
    currentDisplayDiscount > 0 ? String(currentDisplayDiscount) : ''
  )

  const discountAmt = Math.min(parseFloat(discount) || 0, displayPrice)
  const effectivePrice = Math.max(0, displayPrice - discountAmt)
  const hasDiscount = discountAmt > 0

  const handleConfirm = () => {
    onConfirm(item.id, unit, parseFloat(discount) || 0)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div className="min-w-0 pr-2">
            <h2 className="text-sm font-semibold text-gray-800 truncate">{item.name}</h2>
            <p className="text-xs text-gray-400">
              ส่วนลดรายการ {unit && <span className="text-indigo-500">· {unit}</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0">×</button>
        </div>

        {/* Input */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 shrink-0">ลดต่อ{displayUnit}</span>
            <input
              autoFocus
              type="number"
              min={0}
              max={displayPrice}
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
              placeholder="0"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-rose-300 focus:bg-rose-50 transition-colors"
            />
            <span className="text-sm text-gray-400 shrink-0">฿</span>
          </div>

          {/* Price preview */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">ราคา/{displayUnit}</span>
            <span className="text-sm font-semibold">
              {hasDiscount ? (
                <>
                  <s className="text-gray-300 font-normal">฿{displayPrice}</s>
                  {' → '}
                  <span className="text-rose-500">฿{effectivePrice}</span>
                </>
              ) : (
                <span className="text-gray-700">฿{displayPrice}</span>
              )}
            </span>
          </div>

          {displayQty > 1 && hasDiscount && (
            <div className="text-xs text-gray-400 text-right">
              ลดรวม ×{displayQty} = <span className="text-rose-500">-฿{(discountAmt * displayQty).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          {discountAmt > 0 && (
            <button
              onClick={() => { onConfirm(item.id, unit, 0); onClose() }}
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm text-gray-600 transition-colors"
            >
              ล้างส่วนลด
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  )
}
