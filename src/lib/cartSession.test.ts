import { describe, expect, it } from 'vitest'
import type { Drug } from '../types/drug'
import type { Customer } from '../types/customer'
import { cartSession, emptySession, loadSession, saveSession, PARK_SLOT_COUNT, type CartEvent, type CartSession } from './cartSession'

const drug = (over: Partial<Drug> = {}): Drug => ({
  id: 'd1', name: 'Paracetamol', generic_name: '', type: '', strength: '', barcode: '',
  sell_price: 100, cost_price: 40, stock: 20, min_stock: 0, reg_no: '', unit: 'เม็ด',
  report_types: [], created_at: '', prices: { retail: 100, wholesale: 20 }, ...over,
})
const customer = (price_tier: string): Customer =>
  ({ id: 'c1', name: 'ร้านส่ง', phone: '', disease: '-', price_tier, total_spent: 0, last_visit: null, created_at: '' }) as Customer

const run = (...events: CartEvent[]): CartSession => events.reduce(cartSession, emptySession())
const add = (over: Partial<Drug> = {}): CartEvent => ({ type: 'add', drug: drug(over), altUnit: null })

function memoryStorage() {
  const data = new Map<string, string>()
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v) } }
}

describe('cartSession', () => {
  it('adding the same drug twice adds to one line', () => {
    expect(run(add(), add()).live.items).toMatchObject([{ id: 'd1', qty: 2 }])
  })

  it('a line whose qty reaches zero leaves the cart', () => {
    expect(run(add(), { type: 'changeQty', id: 'd1', unit: '', delta: -1 }).live.items).toEqual([])
  })

  it('a line discount is capped at the line price', () => {
    const s = run(add(), { type: 'setItemDiscount', id: 'd1', unit: '', discount: 500 })
    expect(s.live.items[0].itemDiscount).toBe(100)
  })

  it('picking a cheaper-tier customer caps discounts set at the old tier', () => {
    const s = run(add(), { type: 'setItemDiscount', id: 'd1', unit: '', discount: 30 }, { type: 'selectCustomer', customer: customer('wholesale') })
    expect(s.live.priceTier).toBe('wholesale')
    expect(s.live.items[0].itemDiscount).toBe(20)
  })

  it('a customer without a tier, or no customer, means retail', () => {
    expect(run({ type: 'selectCustomer', customer: customer('wholesale') }, { type: 'selectCustomer', customer: customer('') }).live.priceTier).toBe('retail')
    expect(run({ type: 'selectCustomer', customer: customer('vip') }, { type: 'selectCustomer', customer: null }).live.priceTier).toBe('retail')
  })

  it('switching tabs parks the live cart and brings back the other one', () => {
    let s = run(add(), { type: 'switchToSlot', idx: 2, now: 1 })
    expect(s.activeSlot).toBe(2)
    expect(s.live.items).toEqual([])
    expect(s.slots[0]?.items).toHaveLength(1)
    s = cartSession(s, { type: 'switchToSlot', idx: 0, now: 2 })
    expect(s.live.items).toHaveLength(1)
    expect(s.slots.every(v => v === null)).toBe(true)
  })

  it('discarding the active tab clears it; discarding another drops its parked cart', () => {
    let s = run(add(), { type: 'switchToSlot', idx: 1, now: 1 }, add())
    s = cartSession(s, { type: 'discardSlot', idx: 0 })
    expect(s.slots[0]).toBeNull()
    expect(s.live.items).toHaveLength(1)
    expect(cartSession(s, { type: 'discardSlot', idx: 1 }).live.items).toEqual([])
  })

  it('survives a reload, and an unreadable save starts empty', () => {
    const storage = memoryStorage()
    const s = run(add(), { type: 'switchToSlot', idx: 3, now: 1 }, add({ id: 'd2' }))
    saveSession(storage, s, 5)
    const back = loadSession(storage)
    expect(back.activeSlot).toBe(3)
    expect(back.live.items.map(i => i.id)).toEqual(['d2'])
    expect(back.slots[0]?.items.map(i => i.id)).toEqual(['d1'])
    expect(back.slots).toHaveLength(PARK_SLOT_COUNT)
    storage.setItem('pharmacy.parkedCarts', '{nope')
    expect(loadSession(storage)).toEqual(emptySession())
  })
})
