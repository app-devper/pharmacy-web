import { createContext, useContext, useEffect, useReducer, useState } from 'react'
import type { ReactNode } from 'react'
import type { CartItem, ParkedSlot } from '../types/sale'
import type { Drug, AltUnit, PriceTier } from '../types/drug'
import type { Customer } from '../types/customer'
import { getDrugSellPrice } from '../types/drug'
import { resolvePrice } from '../utils/pricing'

const PARKED_STORAGE_KEY = 'pharmacy.parkedCarts'
const PARK_SLOT_COUNT = 5

/**
 * Cart rows are keyed by `drug.id + selected_unit`, so selling 5 tablets and
 * 2 blister packs of the same drug are two separate rows. `selected_unit` may
 * be '' (base unit). Qty is always stored in base units.
 */
function rowMatches(item: CartItem, id: string, unit: string): boolean {
  return item.id === id && (item.selected_unit ?? '') === unit
}

/**
 * Per-BASE-unit price for a cart item, resolving the right pricing tier.
 * - base unit → drug.prices[tier] or drug.sell_price
 * - alt unit  → drug.alt_units[].prices[tier] or alt.sell_price, then ÷ factor
 */
export function itemBasePrice(item: CartItem, tier: PriceTier = 'retail'): number {
  const factor = item.selected_unit_factor ?? 1
  if (factor > 1 && item.selected_unit) {
    const alt = item.alt_units?.find(a => a.name === item.selected_unit)
    if (alt) {
      const perAlt = resolvePrice(alt.sell_price, alt.prices, tier)
      return perAlt / factor
    }
    // Fallback: stored add-time price if alt_units metadata is missing
    return (item.selected_unit_price ?? 0) / factor
  }
  return resolvePrice(getDrugSellPrice(item), item.prices, tier)
}

type CartAction =
  | { type: 'ADD'; drug: Drug; altUnit: AltUnit | null }
  | { type: 'CHANGE_QTY'; id: string; unit: string; delta: number }
  | { type: 'SET_ITEM_DISCOUNT'; id: string; unit: string; discount: number; tier: PriceTier }
  | { type: 'LOAD'; items: CartItem[] }
  | { type: 'CLEAR' }

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'ADD': {
      const alt = action.altUnit
      const unitName = alt?.name ?? ''
      const factor = alt?.factor ?? 1
      const step = factor // adding 1 display unit = `factor` base units
      const idx = state.findIndex(i => rowMatches(i, action.drug.id, unitName))
      if (idx >= 0) {
        const next = [...state]
        const maxQty = action.drug.stock
        next[idx] = { ...next[idx], qty: Math.min(next[idx].qty + step, maxQty) }
        return next
      }
      const newItem: CartItem = {
        ...action.drug,
        qty: step,
        itemDiscount: 0,
      }
      if (alt) {
        newItem.selected_unit = alt.name
        newItem.selected_unit_factor = alt.factor
        newItem.selected_unit_price = alt.sell_price
      }
      return [...state, newItem]
    }
    case 'CHANGE_QTY': {
      return state
        .map(i => {
          if (!rowMatches(i, action.id, action.unit)) return i
          // delta is in display units; multiply by factor to get base-unit delta
          const factor = i.selected_unit_factor ?? 1
          const baseDelta = action.delta * factor
          return { ...i, qty: Math.min(i.qty + baseDelta, i.stock) }
        })
        .filter(i => i.qty > 0)
    }
    case 'SET_ITEM_DISCOUNT': {
      return state.map(i => {
        if (!rowMatches(i, action.id, action.unit)) return i
        // Input discount is per DISPLAY unit (what the user typed). Cap it at
        // the current-tier display price so negative effective prices are
        // impossible regardless of which tier the cart is on.
        const factor = i.selected_unit_factor ?? 1
        const perDisplay = Math.max(0, action.discount)
        const displayPrice = itemBasePrice(i, action.tier) * factor
        const cappedDisplay = Math.min(perDisplay, displayPrice)
        const perBase = cappedDisplay / factor
        return { ...i, itemDiscount: perBase }
      })
    }
    case 'LOAD':
      return action.items
    case 'CLEAR':
      return []
    default:
      return state
  }
}

interface CartContextValue {
  items: CartItem[]
  addToCart: (drug: Drug, altUnit?: AltUnit | null) => void
  /** delta is in DISPLAY units (1 pack, not 10 tablets). */
  changeQty: (id: string, unit: string, delta: number) => void
  /** discount per DISPLAY unit; converted to per-base internally. */
  setItemDiscount: (id: string, unit: string, discount: number) => void
  clearCart: () => void
  total: number
  selectedCustomer: Customer | null
  setSelectedCustomer: (c: Customer | null) => void

  // Cart-wide pricing tier. Changing it reprices every line automatically.
  priceTier: PriceTier
  setPriceTier: (t: PriceTier) => void

  // cart-level discount (moved from Cart.tsx)
  discountInput: string
  discountType: '฿' | '%'
  setDiscountInput: (s: string) => void
  setDiscountType: (t: '฿' | '%') => void

  // 5-tab cart model: activeSlot's cart is the live state (items/customer/discount),
  // other slots hold snapshots in `slots`. slots[activeSlot] is always null.
  activeSlot: number
  slots: (ParkedSlot | null)[]
  switchToSlot: (idx: number) => void
  discardSlot: (idx: number) => void
}

const CartContext = createContext<CartContextValue | null>(null)

function emptySlots(): (ParkedSlot | null)[] {
  return new Array(PARK_SLOT_COUNT).fill(null)
}

interface HydratedState {
  slots: (ParkedSlot | null)[]
  activeSlot: number
  activeLive: ParkedSlot | null   // persisted snapshot of the live (active) cart
}

function hydrateState(): HydratedState {
  try {
    const raw = localStorage.getItem(PARKED_STORAGE_KEY)
    if (!raw) return { slots: emptySlots(), activeSlot: 0, activeLive: null }
    const parsed = JSON.parse(raw) as { slots?: unknown; activeSlot?: unknown; activeLive?: unknown }
    const slots = emptySlots()
    if (Array.isArray(parsed?.slots)) {
      for (let i = 0; i < PARK_SLOT_COUNT; i++) {
        const s = parsed.slots[i] as ParkedSlot | null | undefined
        if (s && Array.isArray(s.items)) slots[i] = s
      }
    }
    const active = typeof parsed?.activeSlot === 'number'
      && parsed.activeSlot >= 0 && parsed.activeSlot < PARK_SLOT_COUNT
      ? parsed.activeSlot : 0
    // invariant: slots[activeSlot] must be null (active tab data lives in-memory)
    slots[active] = null
    // restore persisted live cart
    const al = parsed.activeLive as ParkedSlot | null | undefined
    const activeLive = al && Array.isArray(al.items) && al.items.length > 0 ? al : null
    return { slots, activeSlot: active, activeLive }
  } catch {
    return { slots: emptySlots(), activeSlot: 0, activeLive: null }
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const initial = hydrateState()
  const [items, dispatch] = useReducer(cartReducer, initial.activeLive?.items ?? [])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(initial.activeLive?.customer ?? null)
  const [discountInput, setDiscountInput] = useState(initial.activeLive?.discountInput ?? '')
  const [discountType, setDiscountType] = useState<'฿' | '%'>(initial.activeLive?.discountType ?? '฿')
  const [priceTier, setPriceTierRaw] = useState<PriceTier>(initial.activeLive?.priceTier ?? 'retail')
  const [slots, setSlots] = useState<(ParkedSlot | null)[]>(initial.slots)
  const [activeSlot, setActiveSlot] = useState<number>(initial.activeSlot)

  // persist all slots + active cart to localStorage
  useEffect(() => {
    try {
      const activeLive: ParkedSlot | null = items.length > 0
        ? { items, customer: selectedCustomer, discountInput, discountType, priceTier, parkedAt: Date.now() }
        : null
      localStorage.setItem(
        PARKED_STORAGE_KEY,
        JSON.stringify({ slots, activeSlot, activeLive }),
      )
    } catch {
      // ignore storage errors
    }
  }, [slots, activeSlot, items, selectedCustomer, discountInput, discountType, priceTier])

  const addToCart = (drug: Drug, altUnit: AltUnit | null = null) =>
    dispatch({ type: 'ADD', drug, altUnit })
  const changeQty = (id: string, unit: string, delta: number) =>
    dispatch({ type: 'CHANGE_QTY', id, unit, delta })
  const setItemDiscount = (id: string, unit: string, discount: number) =>
    dispatch({ type: 'SET_ITEM_DISCOUNT', id, unit, discount, tier: priceTier })
  const setPriceTier = (t: PriceTier) => setPriceTierRaw(t)

  // When a customer is picked and they have a default tier, switch the cart
  // to match. Clearing the customer reverts to retail. Wrapped so SellPage
  // doesn't need to know about this coupling.
  const selectCustomer = (c: Customer | null) => {
    setSelectedCustomer(c)
    if (!c) {
      setPriceTierRaw('retail')
      return
    }
    const t = c.price_tier
    if (t === 'retail' || t === 'regular' || t === 'wholesale') {
      setPriceTierRaw(t)
    }
  }

  const resetLive = () => {
    dispatch({ type: 'CLEAR' })
    setSelectedCustomer(null)
    setDiscountInput('')
    setDiscountType('฿')
    setPriceTierRaw('retail')
  }

  const clearCart = () => {
    resetLive()
    // แจ้ง LowStockAlert + ExpiryAlert ให้ refresh
    window.dispatchEvent(new CustomEvent('pharmacy:stock-changed'))
  }

  const snapshotLive = (): ParkedSlot | null => {
    if (items.length === 0) return null
    return {
      items,
      customer: selectedCustomer,
      discountInput,
      discountType,
      priceTier,
      parkedAt: Date.now(),
    }
  }

  const switchToSlot = (idx: number) => {
    if (idx < 0 || idx >= PARK_SLOT_COUNT || idx === activeSlot) return
    const snap = snapshotLive()                      // save current live cart
    const target = slots[idx]                        // load target slot
    setSlots(s =>
      s.map((v, i) => {
        if (i === activeSlot) return snap            // store what we had
        if (i === idx) return null                   // target becomes active → null
        return v
      })
    )
    if (target) {
      dispatch({ type: 'LOAD', items: target.items })
      setSelectedCustomer(target.customer)
      setDiscountInput(target.discountInput)
      setDiscountType(target.discountType)
      setPriceTierRaw(target.priceTier ?? 'retail')
    } else {
      resetLive()
    }
    setActiveSlot(idx)
  }

  const discardSlot = (idx: number) => {
    if (idx < 0 || idx >= PARK_SLOT_COUNT) return
    if (idx === activeSlot) {
      resetLive()
      return
    }
    setSlots(s => s.map((v, i) => i === idx ? null : v))
  }

  // total = sum of (effective base price × base qty). item.qty is base units.
  // Price is resolved at the current cart tier so switching tiers re-prices live.
  const total = Math.round(
    items.reduce((s, i) => {
      const effectivePrice = Math.max(0, itemBasePrice(i, priceTier) - (i.itemDiscount || 0))
      return s + effectivePrice * i.qty
    }, 0) * 100,
  ) / 100

  return (
    <CartContext.Provider value={{
      items, addToCart, changeQty, setItemDiscount, clearCart, total,
      selectedCustomer, setSelectedCustomer: selectCustomer,
      priceTier, setPriceTier,
      discountInput, discountType, setDiscountInput, setDiscountType,
      activeSlot, slots, switchToSlot, discardSlot,
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
