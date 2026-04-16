import { useState } from 'react'
import type { SaleResponse, CartItem } from '../types/sale'
import type { Drug } from '../types/drug'
import { useDrugs } from '../hooks/useDrugs'
import { useCustomers } from '../hooks/useCustomers'
import { useCart } from '../context/CartContext'
import { useBarcodeScanner } from '../hooks/useBarcodeScanner'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useToast } from '../hooks/useToast'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import DrugGrid from '../components/sell/DrugGrid'
import Cart from '../components/sell/Cart'
import ReceiptModal from '../components/sell/ReceiptModal'
import KySaleModal, { type CheckoutData } from '../components/sell/KySaleModal'
import AddCustomerModal from '../components/customers/AddCustomerModal'

export default function SellPage() {
  const { drugs, loading, reload } = useDrugs()
  const { reload: reloadCustomers } = useCustomers()
  const { addToCart, clearCart } = useCart()
  const showToast = useToast()
  const online = useOnlineStatus()
  useKeyboardShortcuts({ onClearCart: clearCart })
  const [receipt, setReceipt] = useState<{ result: SaleResponse; items: CartItem[] } | null>(null)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [kyData, setKyData] = useState<CheckoutData | null>(null)

  useBarcodeScanner((barcode) => {
    const drug = drugs.find(d => d.barcode === barcode)
    if (!drug) {
      showToast(`ไม่พบยาบาร์โค้ด: ${barcode}`, 'error')
      return
    }
    if (drug.stock === 0) {
      showToast(`${drug.name} — หมดสต็อก`, 'error')
      return
    }
    addToCart(drug)
    showToast(`เพิ่ม ${drug.name}`, 'success')
  })

  const handleCheckoutDone = (result: SaleResponse, cartItems: CartItem[]) => {
    setReceipt({ result, items: cartItems })
    reload()
  }

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 57px)' }}>
      {!online && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-sm text-amber-800 shrink-0">
          <span>⚠</span>
          <span>ไม่มีอินเตอร์เน็ต — ใช้ข้อมูลสำรอง บิลจะซิงค์อัตโนมัติเมื่อกลับมาออนไลน์</span>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
      <DrugGrid drugs={drugs} loading={loading} onAdd={(drug: Drug) => addToCart(drug)} scannerActive />
      <Cart
        onCheckoutDone={handleCheckoutDone}
        onReloadDrugs={reload}
        onAddCustomer={() => setShowAddCustomer(true)}
        onKyRequired={setKyData}
      />
      {receipt && (
        <ReceiptModal
          result={receipt.result}
          items={receipt.items}
          onClose={() => setReceipt(null)}
        />
      )}
      {kyData && (
        <KySaleModal
          data={kyData}
          onDone={(result, cartItems) => {
            setKyData(null)
            setReceipt({ result, items: cartItems })
            reload()
          }}
          onCancel={() => setKyData(null)}
        />
      )}
      {showAddCustomer && (
        <AddCustomerModal
          onClose={() => setShowAddCustomer(false)}
          onSaved={() => { setShowAddCustomer(false); reloadCustomers() }}
        />
      )}
      </div>
    </div>
  )
}
