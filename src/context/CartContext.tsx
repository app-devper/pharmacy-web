import { createContext, useContext, useEffect, useReducer } from 'react'
import type { ReactNode } from 'react'
import type { CartItem, ParkedSlot } from '../types/sale'
import type { Drug, AltUnit, PriceTier } from '../types/drug'
import type { Customer } from '../types/customer'
import { cartSession, loadSession, saveSession, type DiscountType } from '../lib/cartSession'

interface CartContextValue {
  items: CartItem[]
  addToCart: (drug: Drug, altUnit?: AltUnit | null) => void
  /** delta is in DISPLAY units (1 pack, not 10 tablets). */
  changeQty: (id: string, unit: string, delta: number) => void
  /** discount per DISPLAY unit; converted to per-base internally. */
  setItemDiscount: (id: string, unit: string, discount: number) => void
  clearCart: () => void
  selectedCustomer: Customer | null
  setSelectedCustomer: (c: Customer | null) => void

  // Cart-wide pricing tier. Read-only to consumers — the tier is derived
  // from the selected customer (customer.price_tier) and resets to 'retail'
  // whenever no customer is selected.
  priceTier: PriceTier

  discountInput: string
  discountType: DiscountType
  setDiscountInput: (s: string) => void
  setDiscountType: (t: DiscountType) => void

  // 5-tab cart model: activeSlot's cart is the live state (items/customer/discount),
  // other slots hold snapshots in `slots`. slots[activeSlot] is always null.
  activeSlot: number
  slots: (ParkedSlot | null)[]
  switchToSlot: (idx: number) => void
  discardSlot: (idx: number) => void
}

const CartContext = createContext<CartContextValue | null>(null)

/** The cashier's cart session (lib/cartSession), saved on this device. */
export function CartProvider({ children }: { children: ReactNode }) {
  const [session, dispatch] = useReducer(cartSession, undefined, () => loadSession(localStorage))

  useEffect(() => {
    saveSession(localStorage, session, Date.now())
  }, [session])

  const { live, activeSlot, slots } = session
  return (
    <CartContext.Provider value={{
      items: live.items,
      addToCart: (drug, altUnit = null) => dispatch({ type: 'add', drug, altUnit }),
      changeQty: (id, unit, delta) => dispatch({ type: 'changeQty', id, unit, delta }),
      setItemDiscount: (id, unit, discount) => dispatch({ type: 'setItemDiscount', id, unit, discount }),
      clearCart: () => dispatch({ type: 'clear' }),
      selectedCustomer: live.customer,
      setSelectedCustomer: customer => dispatch({ type: 'selectCustomer', customer }),
      priceTier: live.priceTier,
      discountInput: live.discountInput,
      discountType: live.discountType,
      setDiscountInput: value => dispatch({ type: 'setDiscountInput', value }),
      setDiscountType: value => dispatch({ type: 'setDiscountType', value }),
      activeSlot,
      slots,
      switchToSlot: idx => dispatch({ type: 'switchToSlot', idx, now: Date.now() }),
      discardSlot: idx => dispatch({ type: 'discardSlot', idx }),
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
