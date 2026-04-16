import { CartItem as CartItemType } from '../../types/sale'
import { getDrugSellPrice } from '../../types/drug'

interface Props {
  item: CartItemType
  onChangeQty: (id: string, delta: number) => void
  onDiscount: (item: CartItemType) => void
}

export default function CartItemRow({ item, onChangeQty, onDiscount }: Props) {
  const price = getDrugSellPrice(item)
  const discount = item.itemDiscount || 0
  const effectivePrice = Math.max(0, price - discount)
  const hasDiscount = discount > 0

  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-50 group">
      {/* คลิกที่ชื่อ/ราคา เพื่อตั้งส่วนลด */}
      <button
        onClick={() => onDiscount(item)}
        className="flex-1 min-w-0 text-left"
      >
        <div className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-600 transition-colors">
          {item.name}
        </div>
        <div className="text-xs text-gray-400">
          {hasDiscount ? (
            <>
              <s className="text-gray-300">฿{price}</s>
              {' '}
              <span className="text-rose-500">฿{effectivePrice}</span>
            </>
          ) : (
            <>฿{price}</>
          )}
          /{item.unit}
          {hasDiscount && (
            <span className="ml-1 text-rose-400">✏</span>
          )}
        </div>
      </button>

      {/* Qty controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onChangeQty(item.id, -1)}
          className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-sm font-bold flex items-center justify-center"
        >−</button>
        <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
        <button
          onClick={() => onChangeQty(item.id, 1)}
          disabled={item.qty >= item.stock}
          className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-sm font-bold flex items-center justify-center disabled:opacity-40"
        >+</button>
      </div>

      {/* Line total */}
      <div className="text-sm font-semibold text-blue-600 w-16 text-right shrink-0">
        ฿{(effectivePrice * item.qty).toLocaleString()}
      </div>
    </div>
  )
}
