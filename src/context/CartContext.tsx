import { createContext, useContext, useReducer, useState } from 'react'
import type { ReactNode } from 'react'
import type { CartItem } from '../types/sale'
import type { Drug } from '../types/drug'
import type { Customer } from '../types/customer'
import { getDrugSellPrice } from '../types/drug'

type CartAction =
  | { type: 'ADD'; drug: Drug }
  | { type: 'CHANGE_QTY'; id: string; delta: number }
  | { type: 'SET_ITEM_DISCOUNT'; id: string; discount: number }
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
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, [])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const addToCart = (drug: Drug) => dispatch({ type: 'ADD', drug })
  const changeQty = (id: string, delta: number) => dispatch({ type: 'CHANGE_QTY', id, delta })
  const setItemDiscount = (id: string, discount: number) => dispatch({ type: 'SET_ITEM_DISCOUNT', id, discount })
  const clearCart = () => {
    dispatch({ type: 'CLEAR' })
    setSelectedCustomer(null)
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
