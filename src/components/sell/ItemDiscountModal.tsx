import { getDrugSellPrice } from '../../types/drug'
import type { CartItem } from '../../types/sale'

interface Props {
  items: CartItem[]
  onSetItemDiscount: (id: string, discount: number) => void
  onClose: () => void
}

export default function ItemDiscountModal({ items, onSetItemDiscount, onClose }: Props) {
  const totalItemDiscount = items.reduce((s, i) => s + (i.itemDiscount || 0) * i.qty, 0)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-semibold text-gray-800">ส่วนลดรายการ</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {items.map(item => {
            const price = getDrugSellPrice(item)
            const discount = item.itemDiscount || 0
            const effectivePrice = Math.max(0, price - discount)
            return (
              <div key={item.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{item.name}</div>
                  <div className="text-xs text-gray-400">
                    {discount > 0 ? (
                      <>
                        <s className="text-gray-300">฿{price}</s>
                        {' → '}
                        <span className="text-rose-500">฿{effectivePrice}</span>
                      </>
                    ) : (
                      <>฿{price}</>
                    )}
                    /{item.unit} × {item.qty}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-gray-400">ลด</span>
                  <input
                    type="number"
                    min={0}
                    max={price}
                    value={discount || ''}
                    onChange={e => onSetItemDiscount(item.id, parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:border-rose-300 focus:bg-rose-50 transition-colors"
                  />
                  <span className="text-xs text-gray-400">฿</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary + footer */}
        <div className="px-5 py-3 border-t border-gray-100 space-y-2 shrink-0">
          {totalItemDiscount > 0 && (
            <div className="flex justify-between text-sm text-rose-500">
              <span>ส่วนลดรายการรวม</span>
              <span>-฿{totalItemDiscount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  )
}
