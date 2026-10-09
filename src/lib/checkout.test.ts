import { describe, expect, it } from 'vitest'
import type { Drug } from '../types/drug'
import type { CartItem } from '../types/sale'
import { kyFormsNeeded, missingKyFields, oversoldLines, saleItemsOf, stockCatchUp, totalsOf } from './checkout'

const drug = (over: Partial<Drug> = {}): Drug => ({
  id: 'd1', name: 'Paracetamol', generic_name: '', type: '', strength: '', barcode: '',
  sell_price: 10, cost_price: 4, stock: 20, min_stock: 0, reg_no: '', unit: 'เม็ด',
  report_types: [], created_at: '', ...over,
})
const line = (over: Partial<CartItem> = {}): CartItem => ({ ...drug(), qty: 2, itemDiscount: 0, ...over })

describe('saleItemsOf', () => {
  it('prices each line per base unit after its discount, with the expected lot and confirmed oversell', () => {
    const lot = { lot_id: 'L1', lot_number: 'A1', expiry_date: '2027-01-01' }
    const items = [
      line({ qty: 10, itemDiscount: 1, selected_unit: 'แผง', selected_unit_factor: 10, alt_units: [{ name: 'แผง', factor: 10, sell_price: 90 }] }),
      line({ id: 'd2', qty: 1 }),
    ]
    const out = saleItemsOf(items, 'retail', [drug({ next_lot: lot }), drug({ id: 'd2' })], new Set(['d2']))
    expect(out[0]).toEqual({
      drug_id: 'd1', qty: 10, price: 8, original_price: 9, item_discount: 1, price_tier: 'retail',
      unit: 'แผง', unit_factor: 10, lot_snapshot: lot,
    })
    expect(out[1].allow_oversell).toBe(true)
    expect(out[0].allow_oversell).toBeUndefined()
  })
})

describe('totalsOf', () => {
  const items = [line({ qty: 3, itemDiscount: 2 })] // 30 gross, 6 line discount, 24 subtotal
  it('applies a baht cart discount, never beyond the subtotal', () => {
    expect(totalsOf(items, 'retail', '4', '฿')).toEqual({ gross: 30, itemDiscount: 6, subtotal: 24, cartDiscount: 4, net: 20 })
    expect(totalsOf(items, 'retail', '100', '฿').net).toBe(0)
  })
  it('applies a percentage of the subtotal', () => {
    expect(totalsOf(items, 'retail', '25', '%').cartDiscount).toBe(6)
  })
  it('treats an empty or bad discount as none', () => {
    expect(totalsOf(items, 'retail', 'abc', '฿').net).toBe(24)
  })
})

describe('oversoldLines', () => {
  it('adds up a drug sold in several units against its stock', () => {
    const items = [line({ qty: 15 }), line({ qty: 10, selected_unit: 'แผง', selected_unit_factor: 10 })]
    expect(oversoldLines(items, [drug({ stock: 20 })])).toEqual([
      { drug_id: 'd1', drug_name: 'Paracetamol', need: 25, available: 20, unit: undefined, unit_factor: undefined },
    ])
    expect(oversoldLines([line({ qty: 20 })], [drug({ stock: 20 })])).toEqual([])
  })
  it('treats negative stock as nothing on hand', () => {
    expect(oversoldLines([line({ qty: 1 })], [drug({ stock: -3 })])).toHaveLength(1)
  })
})

describe('KY', () => {
  const items = [line({ report_types: ['ky12'] }), line({ id: 'd2', report_types: ['ky10', 'ky12'] })]
  it('names the forms the sale needs, none when the shop skips KY', () => {
    expect(kyFormsNeeded(items, false)).toEqual(['ky10', 'ky12'])
    expect(kyFormsNeeded(items, true)).toEqual([])
  })
  it('lists the required fields a capture leaves blank', () => {
    const capture = {
      ky10: { buyer_name: ' ', buyer_address: 'BKK', rx_no: '', doctor: '' },
      ky12: { rx_no: 'RX', patient_name: 'P', doctor: '', hospital: '', status: 'จ่ายแล้ว' },
    }
    expect(missingKyFields(capture, ['ky10', 'ky12'])).toEqual(['ky10.buyer_name', 'ky12.doctor'])
    expect(missingKyFields({}, ['ky11'])).toEqual(['ky11.buyer_name', 'ky11.purpose', 'ky11.pharmacist'])
  })
})

describe('stockCatchUp', () => {
  const items = [{ drug_id: 'd1', qty: 5, price: 10 }, { drug_id: 'd1', qty: 30, price: 10 }]
  it('uses the stock the server reports for a confirmed sale', () => {
    const updates = [{ drug_id: 'd1', new_stock: 7 }]
    expect(stockCatchUp({ status: 'confirmed', sale: { bill_no: 'INV', total: 0, discount: 0, change: 0, stock_updates: updates } }, items, [drug()]))
      .toEqual({ kind: 'patch', updates })
    expect(stockCatchUp({ status: 'confirmed', sale: { bill_no: 'INV', total: 0, discount: 0, change: 0 } }, items, [drug()]))
      .toEqual({ kind: 'reload' })
  })
  it('estimates a pending sale from the stock on hand, never below zero', () => {
    const receipt = { bill_no: 'OFFLINE-1', total: 0, discount: 0, change: 0 }
    expect(stockCatchUp({ status: 'pending', receipt }, items, [drug({ stock: 20 })]))
      .toEqual({ kind: 'patch', updates: [{ drug_id: 'd1', new_stock: 0 }] })
  })
})
