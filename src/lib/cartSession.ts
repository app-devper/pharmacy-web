import type { CartItem, ParkedSlot } from '../types/sale'
import type { AltUnit, Drug, PriceTier } from '../types/drug'
import type { Customer } from '../types/customer'
import { itemBasePrice } from './checkout'

/**
 * Cart session: the cashier's live cart plus the parked carts in the other
 * tabs, as pure state transitions with no React. CartContext is a thin
 * wrapper that holds a session and saves it.
 *
 * Invariants:
 * - a line's discount never exceeds its price at the cart's tier, including
 *   after the customer (and so the tier) changes;
 * - the tier is the selected customer's tier, retail without one;
 * - the active tab's slot is always empty (its cart is `live`).
 */

export const PARK_SLOT_COUNT = 5
export const PARKED_STORAGE_KEY = 'pharmacy.parkedCarts'

export type DiscountType = '฿' | '%'

export interface LiveCart {
  items: CartItem[]
  customer: Customer | null
  discountInput: string
  discountType: DiscountType
  priceTier: PriceTier
}

export interface CartSession {
  live: LiveCart
  activeSlot: number
  slots: (ParkedSlot | null)[]
}

export type CartEvent =
  | { type: 'add'; drug: Drug; altUnit: AltUnit | null }
  /** delta is in DISPLAY units (1 pack, not 10 tablets). */
  | { type: 'changeQty'; id: string; unit: string; delta: number }
  /** discount per DISPLAY unit. */
  | { type: 'setItemDiscount'; id: string; unit: string; discount: number }
  | { type: 'selectCustomer'; customer: Customer | null }
  | { type: 'setDiscountInput'; value: string }
  | { type: 'setDiscountType'; value: DiscountType }
  | { type: 'clear' }
  | { type: 'switchToSlot'; idx: number; now: number }
  | { type: 'discardSlot'; idx: number }

const EMPTY_LIVE: LiveCart = { items: [], customer: null, discountInput: '', discountType: '฿', priceTier: 'retail' }

const emptySlots = (): (ParkedSlot | null)[] => new Array(PARK_SLOT_COUNT).fill(null)

export function emptySession(): CartSession {
  return { live: EMPTY_LIVE, activeSlot: 0, slots: emptySlots() }
}

/**
 * Cart rows are keyed by `drug.id + selected_unit`, so selling 5 tablets and
 * 2 blister packs of the same drug are two separate rows. `selected_unit` may
 * be '' (base unit). Qty is always stored in base units.
 */
function rowMatches(item: CartItem, id: string, unit: string): boolean {
  return item.id === id && (item.selected_unit ?? '') === unit
}

/** The tier a customer buys at: their own, or retail. Custom tier names pass through. */
export function tierOf(customer: Customer | null): PriceTier {
  const t = customer?.price_tier
  return t && t !== 'retail' ? t : 'retail'
}

/** Every line's discount capped at its price at this tier. */
export function capDiscounts(items: CartItem[], tier: PriceTier): CartItem[] {
  return items.map(i => {
    const cap = itemBasePrice(i, tier)
    return (i.itemDiscount || 0) > cap ? { ...i, itemDiscount: cap } : i
  })
}

function addLine(items: CartItem[], drug: Drug, alt: AltUnit | null): CartItem[] {
  const unitName = alt?.name ?? ''
  const step = alt?.factor ?? 1 // adding 1 display unit = `factor` base units
  const idx = items.findIndex(i => rowMatches(i, drug.id, unitName))
  if (idx >= 0) {
    // No qty cap: oversell is allowed; checkout asks the cashier to confirm any shortfall.
    return items.map((i, n) => n === idx ? { ...i, qty: i.qty + step } : i)
  }
  const line: CartItem = { ...drug, qty: step, itemDiscount: 0 }
  if (alt) {
    line.selected_unit = alt.name
    line.selected_unit_factor = alt.factor
    line.selected_unit_price = alt.sell_price
  }
  return [...items, line]
}

function withLive(s: CartSession, live: Partial<LiveCart>): CartSession {
  return { ...s, live: { ...s.live, ...live } }
}

function snapshot(live: LiveCart, now: number): ParkedSlot | null {
  if (live.items.length === 0) return null
  return { ...live, parkedAt: now }
}

function liveOf(slot: ParkedSlot | null): LiveCart {
  if (!slot) return EMPTY_LIVE
  const priceTier = slot.priceTier ?? 'retail'
  return {
    items: capDiscounts(slot.items, priceTier),
    customer: slot.customer,
    discountInput: slot.discountInput,
    discountType: slot.discountType,
    priceTier,
  }
}

export function cartSession(s: CartSession, e: CartEvent): CartSession {
  switch (e.type) {
    case 'add':
      return withLive(s, { items: addLine(s.live.items, e.drug, e.altUnit) })
    case 'changeQty':
      return withLive(s, {
        items: s.live.items
          .map(i => rowMatches(i, e.id, e.unit) ? { ...i, qty: i.qty + e.delta * (i.selected_unit_factor ?? 1) } : i)
          .filter(i => i.qty > 0),
      })
    case 'setItemDiscount':
      return withLive(s, {
        items: s.live.items.map(i => {
          if (!rowMatches(i, e.id, e.unit)) return i
          const factor = i.selected_unit_factor ?? 1
          const perBase = Math.max(0, e.discount) / factor
          return { ...i, itemDiscount: Math.min(perBase, itemBasePrice(i, s.live.priceTier)) }
        }),
      })
    case 'selectCustomer': {
      const priceTier = tierOf(e.customer)
      return withLive(s, { customer: e.customer, priceTier, items: capDiscounts(s.live.items, priceTier) })
    }
    case 'setDiscountInput':
      return withLive(s, { discountInput: e.value })
    case 'setDiscountType':
      return withLive(s, { discountType: e.value })
    case 'clear':
      return { ...s, live: EMPTY_LIVE }
    case 'switchToSlot': {
      if (e.idx < 0 || e.idx >= PARK_SLOT_COUNT || e.idx === s.activeSlot) return s
      const target = s.slots[e.idx]
      const slots = s.slots.map((v, i) => {
        if (i === s.activeSlot) return snapshot(s.live, e.now)
        if (i === e.idx) return null
        return v
      })
      return { live: liveOf(target), activeSlot: e.idx, slots }
    }
    case 'discardSlot':
      if (e.idx < 0 || e.idx >= PARK_SLOT_COUNT) return s
      if (e.idx === s.activeSlot) return { ...s, live: EMPTY_LIVE }
      return { ...s, slots: s.slots.map((v, i) => i === e.idx ? null : v) }
  }
}

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>

/** The session saved on this device, or an empty one when there is none or it is unreadable. */
export function loadSession(storage: KeyValueStore): CartSession {
  try {
    const raw = storage.getItem(PARKED_STORAGE_KEY)
    if (!raw) return emptySession()
    const parsed = JSON.parse(raw) as { slots?: unknown; activeSlot?: unknown; activeLive?: unknown }
    const slots = emptySlots()
    if (Array.isArray(parsed?.slots)) {
      for (let i = 0; i < PARK_SLOT_COUNT; i++) {
        const slot = parsed.slots[i] as ParkedSlot | null | undefined
        if (slot && Array.isArray(slot.items)) slots[i] = slot
      }
    }
    const activeSlot = typeof parsed?.activeSlot === 'number' && parsed.activeSlot >= 0 && parsed.activeSlot < PARK_SLOT_COUNT
      ? parsed.activeSlot : 0
    slots[activeSlot] = null
    const al = parsed.activeLive as ParkedSlot | null | undefined
    const live = al && Array.isArray(al.items) && al.items.length > 0 ? liveOf(al) : EMPTY_LIVE
    return { live, activeSlot, slots }
  } catch {
    return emptySession()
  }
}

/** Saves the session so a reload keeps the live cart and the parked ones. */
export function saveSession(storage: KeyValueStore, s: CartSession, now: number): void {
  try {
    storage.setItem(PARKED_STORAGE_KEY, JSON.stringify({
      slots: s.slots, activeSlot: s.activeSlot, activeLive: snapshot(s.live, now),
    }))
  } catch {
    // A full or blocked storage only loses the parked carts on reload.
  }
}
