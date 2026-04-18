import { SaleResponse, CartItem } from '../../types/sale'
import { printReceipt } from '../../utils/printReceipt'
import { itemBasePrice, useCart } from '../../context/CartContext'
import { useSettings } from '../../context/SettingsContext'
import { getTierLabel } from '../../utils/pricing'

interface Props {
  result: SaleResponse
  items: CartItem[]
  onClose: () => void
}

export default function ReceiptModal({ result, items, onClose }: Props) {
  const { settings } = useSettings()
  const { priceTier } = useCart()
  const date = new Date().toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const handlePrint = () => {
    printReceipt({
      billNo:   result.bill_no,
      date,
      items:    items.map(i => {
        const factor = i.selected_unit_factor ?? 1
        const basePrice = Math.max(0, itemBasePrice(i, priceTier) - (i.itemDiscount || 0))
        return {
          name:  i.name,
          qty:   Math.floor(i.qty / factor),            // display qty
          price: basePrice * factor,                    // per display unit
          unit:  i.selected_unit || i.unit,
        }
      }),
      discount: result.discount,
      total:    result.total,
      received: result.total + result.change,  // received = total + change
      change:   result.change,
      paperWidth:     settings.receipt.paper_width === '80' ? '80mm' : '58mm',
      shopName:       settings.store.name,
      shopAddress:    settings.store.address,
      shopPhone:      settings.store.phone,
      shopTaxId:      settings.store.tax_id,
      headerText:     settings.receipt.header,
      footerText:     settings.receipt.footer,
      pharmacistName: settings.receipt.show_pharmacist && settings.pharmacist.name
        ? settings.pharmacist.name + (settings.pharmacist.license_no ? ` (${settings.pharmacist.license_no})` : '')
        : '',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 overscroll-contain" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="text-center px-5 pt-5 pb-3 border-b border-dashed border-gray-200">
          <div className="font-bold text-lg text-gray-800">{settings.store.name || 'ร้านยา'}</div>
          {settings.store.address && <div className="text-xs text-gray-500">{settings.store.address}</div>}
          {settings.store.phone && <div className="text-xs text-gray-500">โทร. {settings.store.phone}</div>}
          {settings.receipt.header && <div className="text-xs text-gray-600 italic mt-1">{settings.receipt.header}</div>}
          <div className="text-sm text-gray-600 mt-1">{date}</div>
          <div className="text-xs text-gray-400">เลขที่ {result.bill_no}</div>
        </div>
        {priceTier !== 'retail' && (
          <div className="px-5 pt-2 text-xs text-center text-indigo-600">
            ราคา: <span className="font-semibold">{getTierLabel(priceTier)}</span>
          </div>
        )}
        <div className="px-5 py-3 space-y-1.5 max-h-48 overflow-y-auto">
          {items.map(item => {
            const factor = item.selected_unit_factor ?? 1
            const basePrice = Math.max(0, itemBasePrice(item, priceTier) - (item.itemDiscount || 0))
            const displayQty = Math.floor(item.qty / factor)
            const displayUnit = item.selected_unit || item.unit
            const lineTotal = basePrice * item.qty
            return (
              <div key={`${item.id}::${item.selected_unit ?? ''}`} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.name} — {displayQty} {displayUnit}
                </span>
                <span className="text-gray-800 font-medium">฿{lineTotal.toLocaleString()}</span>
              </div>
            )
          })}
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
          {settings.receipt.show_pharmacist && settings.pharmacist.name && (
            <div className="text-xs text-gray-400 text-center pt-2">
              เภสัชกร: {settings.pharmacist.name}
              {settings.pharmacist.license_no && <span className="text-gray-300"> · {settings.pharmacist.license_no}</span>}
            </div>
          )}
          {settings.receipt.footer && (
            <div className="text-xs text-gray-500 text-center pt-2 italic">{settings.receipt.footer}</div>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={handlePrint}
            aria-label="พิมพ์ใบเสร็จ"
            className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            🖨 พิมพ์
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}
