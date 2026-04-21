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
  const { addToCart, clearCart, items: cartItems } = useCart()
  const showToast = useToast()
  const online = useOnlineStatus()
  useKeyboardShortcuts({ onClearCart: clearCart })
  const [receipt, setReceipt] = useState<{ result: SaleResponse; items: CartItem[]; tier: PriceTier } | null>(null)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [kyData, setKyData] = useState<CheckoutData | null>(null)
  const [lastScannedId, setLastScannedId] = useState<string | null>(null)
  // Cart is a drawer on <md (mobile): FAB with item badge opens it; DrugGrid
  // takes the full width underneath. ≥md keeps the original side-by-side.
  const [cartOpen, setCartOpen] = useState(false)
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
    // Stock ≤ 0 is allowed — the cart will surface an oversell confirm at
    // checkout. We still surface a quick toast so the cashier knows why
    // things look sparse on the card.
    addToCart(matchedDrug, matchedAlt)
    const unitLabel = matchedAlt ? ` (${matchedAlt.name})` : ''
    const suffix = matchedDrug.stock <= 0 ? ' · ขายล่วงหน้า' : ''
    showToast(`เพิ่ม ${matchedDrug.name}${unitLabel}${suffix}`, 'success')
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
        <div className="flex items-start gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-sm text-amber-800 shrink-0">
          <span aria-hidden="true" className="shrink-0 mt-0.5">⚠</span>
          <div className="leading-snug">
            <div>ไม่มีอินเตอร์เน็ต — ใช้ข้อมูลสำรอง บิลจะซิงค์อัตโนมัติเมื่อกลับมาออนไลน์</div>
            <div className="text-[11px] text-amber-700">สต็อก/ราคาอาจไม่เป็นปัจจุบัน · ตรวจยอดอีกครั้งเมื่อออนไลน์</div>
          </div>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden relative">
        <DrugGrid
          drugs={drugs}
          loading={loading}
          onAdd={(drug: Drug, altUnit?: AltUnit | null) => {
            addToCart(drug, altUnit ?? null)
            // On mobile the cart is hidden — give the cashier a hint that
            // the item landed by popping the drawer open automatically after
            // the first add so they can see the current state.
            if (window.matchMedia('(max-width: 767px)').matches && cartItems.length === 0) {
              setCartOpen(true)
            }
          }}
          scannerActive
          highlightedId={lastScannedId}
        />
        {/* Desktop / tablet — cart is always visible as the right column */}
        <div className="hidden md:block">
          <Cart
            onCheckoutDone={handleCheckoutDone}
            onReloadDrugs={reload}
            onAddCustomer={() => setShowAddCustomer(true)}
            onKyRequired={setKyData}
          />
        </div>

        {/* Mobile — cart is a right-side drawer toggled by a FAB */}
        <div
          className={`md:hidden fixed inset-0 z-30 transition-opacity ${
            cartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden={!cartOpen}
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <div
            className={`absolute top-0 bottom-0 right-0 transition-transform duration-200 ease-out ${
              cartOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <Cart
              onCheckoutDone={(r, i, t) => { setCartOpen(false); handleCheckoutDone(r, i, t) }}
              onReloadDrugs={reload}
              onAddCustomer={() => setShowAddCustomer(true)}
              onKyRequired={(d) => { setCartOpen(false); setKyData(d) }}
            />
          </div>
        </div>
        {/* FAB — mobile only, shows cart item count */}
        {cartItems.length > 0 && !cartOpen && (
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="md:hidden fixed bottom-5 right-5 z-20 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full shadow-lg px-5 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400"
            aria-label={`เปิดตะกร้า (${cartItems.length} รายการ)`}
          >
            <span aria-hidden="true">🛒</span>
            <span>ตะกร้า</span>
            <span className="bg-white text-blue-600 text-xs font-bold rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1.5">
              {cartItems.length}
            </span>
          </button>
        )}
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
