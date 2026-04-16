interface Props {
  subtotal: number          // ยอดหลังหักส่วนลดรายการแล้ว
  cartDiscount: string
  cartDiscountType: '฿' | '%'
  onSetCartDiscount: (val: string) => void
  onSetCartDiscountType: (type: '฿' | '%') => void
  onClose: () => void
}

export default function CartDiscountModal({
  subtotal,
  cartDiscount,
  cartDiscountType,
  onSetCartDiscount,
  onSetCartDiscountType,
  onClose,
}: Props) {
  const value = parseFloat(cartDiscount) || 0
  const discountAmt = cartDiscountType === '%'
    ? Math.min(subtotal * value / 100, subtotal)
    : Math.min(value, subtotal)
  const netTotal = subtotal - discountAmt

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-semibold text-gray-800">ส่วนลดรวม</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Input */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="number"
              min={0}
              value={cartDiscount}
              onChange={e => onSetCartDiscount(e.target.value)}
              placeholder="0"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-rose-300 focus:bg-rose-50 transition-colors text-base"
            />
            <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
              {(['฿', '%'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => onSetCartDiscountType(t)}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    cartDiscountType === t
                      ? 'bg-rose-500 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >{t}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mx-5 mb-4 bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-500">
            <span>ยอดก่อนส่วนลด</span>
            <span>฿{fmt(subtotal)}</span>
          </div>
          {discountAmt > 0 && (
            <div className="flex justify-between text-sm text-rose-500">
              <span>ส่วนลด{cartDiscountType === '%' ? ` ${value}%` : ''}</span>
              <span>-฿{fmt(discountAmt)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1.5 border-t border-gray-200">
            <span className="text-sm font-semibold text-gray-700">ยอดสุทธิ</span>
            <span className="text-base font-bold text-blue-600">฿{fmt(netTotal)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-4 shrink-0">
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
