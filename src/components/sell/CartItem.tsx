import { CartItem as CartItemType } from '../../types/sale'
import { itemBasePrice, useCart } from '../../context/CartContext'

interface Props {
  item: CartItemType
  onChangeQty: (id: string, unit: string, delta: number) => void
  onDiscount: (item: CartItemType) => void
}

export default function CartItemRow({ item, onChangeQty, onDiscount }: Props) {
  const { priceTier } = useCart()
  const unit = item.selected_unit ?? ''
  const factor = item.selected_unit_factor ?? 1
  // basePrice = per BASE unit at the cart's current tier; displayPrice = per DISPLAY unit.
  const basePrice = itemBasePrice(item, priceTier)
  const displayPrice = basePrice * factor
  const baseDiscount = item.itemDiscount || 0
  const displayDiscount = baseDiscount * factor
  const effectiveDisplayPrice = Math.max(0, displayPrice - displayDiscount)
  const hasDiscount = baseDiscount > 0
  const displayQty = Math.floor(item.qty / factor)
  const displayUnit = unit || item.unit

  // Disable + button when the next display-unit step would exceed stock
  const canIncrement = item.qty + factor <= item.stock

  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-50 group">
      {/* คลิกที่ชื่อ/ราคา เพื่อตั้งส่วนลด */}
      <button
        onClick={() => onDiscount(item)}
        className="flex-1 min-w-0 text-left"
      >
        <div className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors">
          {item.name}
          {unit && (
            <span className="ml-1 text-xs font-normal text-indigo-500">· {unit}</span>
          )}
        </div>
        <div className="text-xs text-gray-400">
          {hasDiscount ? (
            <>
              <s className="text-gray-300">฿{displayPrice}</s>
              {' '}
              <span className="text-rose-500">฿{effectiveDisplayPrice}</span>
            </>
          ) : (
            <>฿{displayPrice}</>
          )}
          /{displayUnit}
          {hasDiscount && (
            <span className="ml-1 text-rose-400">✏</span>
          )}
        </div>
      </button>

      {/* Qty controls (display units) */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onChangeQty(item.id, unit, -1)}
          className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-sm font-bold flex items-center justify-center"
        >−</button>
        <span className="w-6 text-center text-sm font-medium">{displayQty}</span>
        <button
          onClick={() => onChangeQty(item.id, unit, 1)}
          disabled={!canIncrement}
          className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-sm font-bold flex items-center justify-center disabled:opacity-40"
        >+</button>
      </div>

      {/* Line total */}
      <div className="text-sm font-semibold text-blue-600 w-16 text-right shrink-0">
        ฿{(effectiveDisplayPrice * displayQty).toLocaleString()}
      </div>
    </div>
  )
}
