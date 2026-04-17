import { createContext, useContext, useEffect, useReducer, useState } from 'react'
import type { ReactNode } from 'react'
import type { CartItem, ParkedSlot } from '../types/sale'
import type { Drug } from '../types/drug'
import type { Customer } from '../types/customer'
import { getDrugSellPrice } from '../types/drug'

const PARKED_STORAGE_KEY = 'pharmacy.parkedCarts'
const PARK_SLOT_COUNT = 5

type CartAction =
  | { type: 'ADD'; drug: Drug }
  | { type: 'CHANGE_QTY'; id: string; delta: number }
  | { type: 'SET_ITEM_DISCOUNT'; id: string; discount: number }
  | { type: 'LOAD'; items: CartItem[] }
  | { type: 'CLEAR' }

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'ADD': {
      const idx = state.findIndex(i => i.id === action.drug.id)
      if (idx >= 0) {
        const next = [...state]
        const maxQty = action.drug.stock
        next[idx] = { ...next[idx], qty: Math.min(next[idx].qty + 1, maxQty) }
        return next
      }
      return [...state, { ...action.drug, qty: 1, itemDiscount: 0 }]
    }
    case 'CHANGE_QTY': {
      return state
        .map(i => i.id === action.id ? { ...i, qty: i.qty + action.delta } : i)
        .filter(i => i.qty > 0)
    }
    case 'SET_ITEM_DISCOUNT': {
      return state.map(i =>
        i.id === action.id
          ? { ...i, itemDiscount: Math.max(0, Math.min(action.discount, getDrugSellPrice(i))) }
          : i
      )
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
  addToCart: (drug: Drug) => void
  changeQty: (id: string, delta: number) => void
  setItemDiscount: (id: string, discount: number) => void
  clearCart: () => void
  total: number
  selectedCustomer: Customer | null
  setSelectedCustomer: (c: Customer | null) => void

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
  const [slots, setSlots] = useState<(ParkedSlot | null)[]>(initial.slots)
  const [activeSlot, setActiveSlot] = useState<number>(initial.activeSlot)

  // persist all slots + active cart to localStorage
  useEffect(() => {
    try {
      const activeLive: ParkedSlot | null = items.length > 0
        ? { items, customer: selectedCustomer, discountInput, discountType, parkedAt: Date.now() }
        : null
      localStorage.setItem(
        PARKED_STORAGE_KEY,
        JSON.stringify({ slots, activeSlot, activeLive }),
      )
    } catch {
      // ignore storage errors
    }
  }, [slots, activeSlot, items, selectedCustomer, discountInput, discountType])

  const addToCart = (drug: Drug) => dispatch({ type: 'ADD', drug })
  const changeQty = (id: string, delta: number) => dispatch({ type: 'CHANGE_QTY', id, delta })
  const setItemDiscount = (id: string, discount: number) => dispatch({ type: 'SET_ITEM_DISCOUNT', id, discount })

  const resetLive = () => {
    dispatch({ type: 'CLEAR' })
    setSelectedCustomer(null)
    setDiscountInput('')
    setDiscountType('฿')
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

  // total คำนวณจาก effective price (หักส่วนลดรายการแล้ว)
  const total = items.reduce((s, i) => {
    const effectivePrice = Math.max(0, getDrugSellPrice(i) - (i.itemDiscount || 0))
    return s + effectivePrice * i.qty
  }, 0)

  return (
    <CartContext.Provider value={{
      items, addToCart, changeQty, setItemDiscount, clearCart, total,
      selectedCustomer, setSelectedCustomer,
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
