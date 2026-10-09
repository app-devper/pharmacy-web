import { describe, expect, it, vi } from 'vitest'

vi.mock('../api/kyforms', () => Object.fromEntries(
  ['getKy9', 'addKy9', 'getKy10', 'addKy10', 'getKy11', 'addKy11', 'getKy12', 'addKy12'].map(n => [n, vi.fn()]),
))
vi.mock('../utils/exportXlsx', () => Object.fromEntries(
  ['exportKy9Xlsx', 'exportKy10Xlsx', 'exportKy11Xlsx', 'exportKy12Xlsx'].map(n => [n, vi.fn()]),
))

const { KY10, KY11, KY12, missingFields, toInput } = await import('./kyRegister')

const ky10 = { date: '2026-05-17', drug_name: 'Phenobarbital', reg_no: '', qty: '30', unit: 'เม็ด', buyer_name: 'นาย ก', buyer_address: '', rx_no: '', doctor: '', balance: '' }

describe('KY registers', () => {
  it('needs what pharmacy-api requires, leaving shop defaults to the server', () => {
    expect(missingFields(KY10, ky10)).toEqual([])
    expect(missingFields(KY10, { ...ky10, buyer_name: ' ', qty: '0' })).toEqual(['qty', 'buyer_name'])
    expect(missingFields(KY11, { date: '2026-05-17', drug_name: 'x', reg_no: '', qty: '1', unit: '', buyer_name: 'B', purpose: '', pharmacist: '' }))
      .toEqual(['purpose'])
    expect(missingFields(KY12, { date: '2026-05-17', rx_no: 'RX', patient_name: 'P', doctor: '', hospital: '', drug_name: 'x', qty: '1', unit: '', total_value: '', status: '' }))
      .toEqual(['doctor'])
  })

  it('turns the typed form into the register input', () => {
    expect(toInput(KY10, { ...ky10, buyer_name: ' นาย ก ', balance: '' })).toEqual({ ...ky10, qty: 30, balance: 0 })
  })
})
