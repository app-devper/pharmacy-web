import { getDrugSellPrice } from '../../types/drug'
import type { CartItem } from '../../types/sale'

interface Props {
  items: CartItem[]
  cartDiscount: string
  cartDiscountType: '฿' | '%'
  onSetItemDiscount: (id: string, discount: number) => void
  onSetCartDiscount: (val: string) => void
  onSetCartDiscountType: (type: '฿' | '%') => void
  onClose: () => void
}

const inp = 'border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:border-rose-300 focus:bg-rose-50 transition-colors'

export default function DiscountModal({
  items,
  cartDiscount,
  cartDiscountType,
  onSetItemDiscount,
  onSetCartDiscount,
  onSetCartDiscountType,
  onClose,
}: Props) {
  // Summary calculations
  const grossSubtotal = items.reduce((s, i) => s + getDrugSellPrice(i) * i.qty, 0)
  const totalItemDiscount = items.reduce((s, i) => s + (i.itemDiscount || 0) * i.qty, 0)
  const netAfterItems = grossSubtotal - totalItemDiscount

  const cartDiscountValue = parseFloat(cartDiscount) || 0
  const cartDiscountAmt = cartDiscountType === '%'
    ? Math.min(netAfterItems * cartDiscountValue / 100, netAfterItems)
    : Math.min(cartDiscountValue, netAfterItems)
  const netTotal = netAfterItems - cartDiscountAmt

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-semibold text-gray-800">ส่วนลด</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── ส่วนลดรายการ ── */}
          <div className="px-5 pt-4 pb-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">ส่วนลดรายการ</div>
            <div className="space-y-2">
              {items.map(item => {
                const price = getDrugSellPrice(item)
                const discount = item.itemDiscount || 0
                return (
                  <div key={item.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-700 truncate">{item.name}</div>
                      <div className="text-xs text-gray-400">
                        ฿{price}/{item.unit} × {item.qty}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-gray-400">ลด</span>
                      <input
                        type="number"
                        min={0}
                        max={price}
                        value={discount || ''}
                        onChange={e => onSetItemDiscount(item.id, parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className={`w-16 ${inp}`}
                      />
                      <span className="text-xs text-gray-400">฿/หน่วย</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── ส่วนลดรวม ── */}
          <div className="px-5 pt-3 pb-4 border-t border-gray-100 mt-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">ส่วนลดรวม</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={cartDiscount}
                onChange={e => onSetCartDiscount(e.target.value)}
                placeholder="0"
                className={`flex-1 ${inp}`}
              />
              <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
                {(['฿', '%'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => onSetCartDiscountType(t)}
                    className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                      cartDiscountType === t
                        ? 'bg-rose-500 text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >{t}</button>
                ))}
              </div>
            </div>
          </div>

          {/* ── สรุป ── */}
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-1.5">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">สรุป</div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>ยอดย่อย</span>
              <span>฿{fmt(grossSubtotal)}</span>
            </div>
            {totalItemDiscount > 0 && (
              <div className="flex justify-between text-sm text-rose-500">
                <span>ส่วนลดรายการ</span>
                <span>-฿{fmt(totalItemDiscount)}</span>
              </div>
            )}
            {cartDiscountAmt > 0 && (
              <div className="flex justify-between text-sm text-rose-500">
                <span>ส่วนลดรวม{cartDiscountType === '%' ? ` (${cartDiscountValue}%)` : ''}</span>
                <span>-฿{fmt(cartDiscountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-gray-200">
              <span className="text-sm font-semibold text-gray-700">ยอดสุทธิ</span>
              <span className="text-base font-bold text-blue-600">฿{fmt(netTotal)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 shrink-0">
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
