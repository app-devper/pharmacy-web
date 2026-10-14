import { describe, expect, it } from 'vitest'
import { draftProblems, drugUpdateOf, newDrugInput, reportTypesOf } from './drugDraft'

describe('reportTypesOf', () => {
  it('accepts the stored form, the Thai label and loose spacing, once each', () => {
    expect(reportTypesOf('ky10, ขย.11, KY 12, ky10')).toEqual({ types: ['ky10', 'ky11', 'ky12'], unknown: [] })
    expect(reportTypesOf(['ขย.9'])).toEqual({ types: ['ky9'], unknown: [] })
  })

  it('reports a misspelt type instead of silently dropping it', () => {
    expect(reportTypesOf('ky10, ky13, controlled')).toEqual({ types: ['ky10'], unknown: ['ky13', 'controlled'] })
  })
})

describe('newDrugInput', () => {
  it('applies the shared defaults and reads numbers leniently', () => {
    expect(newDrugInput({ name: ' Para ', retail: '1,200', cost_price: 'x', stock: '5.7', min_stock: -3 })).toEqual({
      name: 'Para', generic_name: '', type: 'ยาสามัญ', strength: '', barcode: '',
      sell_price: 1200, cost_price: 0, stock: 5, min_stock: 0, reg_no: '', unit: 'เม็ด',
      report_types: [], prices: { retail: 1200 },
    })
  })

  it('puts opening stock into the lot on a single create', () => {
    const input = newDrugInput({ name: 'Para', stock: '10' }, { lot: { lot_number: ' A1 ', expiry_date: '2027-01-01' } })
    expect(input.create_lot).toEqual({
      lot_number: 'A1', expiry_date: '2027-01-01', import_date: '', cost_price: null, sell_price: null, quantity: 10,
    })
  })

  it('creates no lot without stock, or for a bulk row', () => {
    expect(newDrugInput({ name: 'Para', stock: '0' }, { lot: { lot_number: 'A1', expiry_date: '2027-01-01' } }).create_lot).toBeUndefined()
    expect(newDrugInput({ name: 'Para', stock: '10' }).create_lot).toBeUndefined()
  })

  it('lets a source choose its own defaults', () => {
    expect(newDrugInput({ name: 'Mask' }, { defaults: { type: 'เวชภัณฑ์', unit: 'ชิ้น' } })).toMatchObject({ type: 'เวชภัณฑ์', unit: 'ชิ้น' })
  })
})

describe('drugUpdateOf', () => {
  it('maps the same fields as a create, plus the editors\' alt units and tiers', () => {
    const update = drugUpdateOf({ name: 'Para', retail: '12', unit: '', report_types: ['ky11'] }, { prices: { retail: 12, wholesale: 10 } })
    expect(update).toMatchObject({ name: 'Para', sell_price: 12, unit: 'เม็ด', report_types: ['ky11'], prices: { retail: 12, wholesale: 10 } })
    expect(update).not.toHaveProperty('stock')
  })
})

describe('draftProblems', () => {
  it('needs a name and known report types everywhere', () => {
    expect(draftProblems({ name: ' ', report_types: 'ky13' })).toEqual([
      'กรุณากรอกชื่อยา',
      'ประเภทรายงานไม่ถูกต้อง: ky13 (ใช้ ky9–ky12)',
    ])
  })

  it('needs a lot number and an expiry for opening stock on a single create', () => {
    expect(draftProblems({ name: 'Para', stock: '3' }, { lot: { lot_number: '', expiry_date: '' } }))
      .toEqual(['กรุณากรอกเลขล็อต', 'กรุณาระบุวันหมดอายุ'])
    expect(draftProblems({ name: 'Para', stock: '0' }, { lot: { lot_number: '', expiry_date: '' } })).toEqual([])
  })

  it('does not ask a bulk row for a lot', () => {
    expect(draftProblems({ name: 'Para', stock: '3' })).toEqual([])
  })
})
