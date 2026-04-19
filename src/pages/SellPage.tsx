import { useState, useRef, useEffect } from 'react'
import type { SaleResponse, CartItem } from '../types/sale'
import type { Drug, AltUnit, PriceTier } from '../types/drug'
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
  const { drugs, loading, reload, patchStocks } = useDrugs()
  const { reload: reloadCustomers } = useCustomers()
  const { addToCart, clearCart } = useCart()
  const showToast = useToast()
  const online = useOnlineStatus()
  useKeyboardShortcuts({ onClearCart: clearCart })
  const [receipt, setReceipt] = useState<{ result: SaleResponse; items: CartItem[]; tier: PriceTier } | null>(null)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [kyData, setKyData] = useState<CheckoutData | null>(null)
  const [lastScannedId, setLastScannedId] = useState<string | null>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => { clearTimeout(highlightTimer.current) }, [])

  useBarcodeScanner((barcode) => {
    // Match precedence:
    //   1. An alt_unit barcode → adds that specific unit to the cart
    //   2. The drug's main barcode
    //   3. reg_no fallback (scanners that print the registration number)
    let matchedDrug: Drug | undefined
    let matchedAlt: AltUnit | null = null
    for (const d of drugs) {
      const alt = (d.alt_units ?? []).find(a => !a.hidden && a.barcode && a.barcode === barcode)
      if (alt) { matchedDrug = d; matchedAlt = alt; break }
    }
    if (!matchedDrug) {
      matchedDrug = drugs.find(d =>
        (d.barcode && d.barcode === barcode) ||
        (d.reg_no  && d.reg_no  === barcode)
      )
    }
    if (!matchedDrug) {
      showToast(`ไม่พบยาบาร์โค้ด: ${barcode}`, 'error')
      return
    }
    if (matchedDrug.stock === 0) {
      showToast(`${matchedDrug.name} — หมดสต็อก`, 'error')
      return
    }
    addToCart(matchedDrug, matchedAlt)
    const unitLabel = matchedAlt ? ` (${matchedAlt.name})` : ''
    showToast(`เพิ่ม ${matchedDrug.name}${unitLabel}`, 'success')
    setLastScannedId(matchedDrug.id)
    clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => setLastScannedId(null), 800)
  })

  const handleCheckoutDone = (result: SaleResponse, cartItems: CartItem[], tier: PriceTier) => {
    setReceipt({ result, items: cartItems, tier })
  }

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100svh - 57px)' }}>
      {!online && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-sm text-amber-800 shrink-0">
          <span aria-hidden="true">⚠</span>
          <span>ไม่มีอินเตอร์เน็ต — ใช้ข้อมูลสำรอง บิลจะซิงค์อัตโนมัติเมื่อกลับมาออนไลน์</span>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <DrugGrid
          drugs={drugs}
          loading={loading}
          onAdd={(drug: Drug, altUnit?: AltUnit | null) => addToCart(drug, altUnit ?? null)}
          scannerActive
          highlightedId={lastScannedId}
        />
        <Cart
          onCheckoutDone={handleCheckoutDone}
          onReloadDrugs={reload}
          onAddCustomer={() => setShowAddCustomer(true)}
          onKyRequired={setKyData}
        />
      </div>
      {receipt && (
        <ReceiptModal
          result={receipt.result}
          items={receipt.items}
          tier={receipt.tier}
          onClose={() => setReceipt(null)}
        />
      )}
      {kyData && (
        <KySaleModal
          data={kyData}
          onDone={(result, cartItems, tier) => {
            setKyData(null)
            setReceipt({ result, items: cartItems, tier })
            if (result.stock_updates && result.stock_updates.length > 0) {
              patchStocks(result.stock_updates)
            } else {
              reload()
            }
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
  )
}
