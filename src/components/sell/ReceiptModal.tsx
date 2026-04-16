import { SaleResponse, CartItem } from '../../types/sale'
import { getDrugSellPrice } from '../../types/drug'
import { printReceipt } from '../../utils/printReceipt'

interface Props {
  result: SaleResponse
  items: CartItem[]
  onClose: () => void
}

export default function ReceiptModal({ result, items, onClose }: Props) {
  const date = new Date().toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const handlePrint = () => {
    printReceipt({
      billNo:   result.bill_no,
      date,
      items:    items.map(i => ({ name: i.name, qty: i.qty, price: getDrugSellPrice(i) })),
      discount: result.discount,
      total:    result.total,
      received: result.total + result.change,  // received = total + change
      change:   result.change,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="text-center px-5 pt-5 pb-3 border-b border-dashed border-gray-200">
          <div className="font-bold text-lg text-gray-800">ร้านยา เฮลท์ตี้ฟาร์ม</div>
          <div className="text-xs text-gray-500">อุบลราชธานี</div>
          <div className="text-sm text-gray-600 mt-1">{date}</div>
          <div className="text-xs text-gray-400">เลขที่ {result.bill_no}</div>
        </div>
        <div className="px-5 py-3 space-y-1.5 max-h-48 overflow-y-auto">
          {items.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-700">{item.name} ×{item.qty}</span>
              <span className="text-gray-800 font-medium">฿{(getDrugSellPrice(item) * item.qty).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-dashed border-gray-200 space-y-1">
          {result.discount > 0 && (
            <div className="flex justify-between text-sm text-rose-500">
              <span>ส่วนลด</span>
              <span>-฿{result.discount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base">
            <span>ยอดสุทธิ</span>
            <span className="text-blue-600">฿{result.total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500">
            <span>ทอน</span>
            <span>฿{result.change.toLocaleString()}</span>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-lg text-sm transition-colors"
          >
            🖨 พิมพ์
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}
