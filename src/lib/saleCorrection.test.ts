import { describe, expect, it, vi } from 'vitest'
import { CorrectionRefused, saleCorrections, type CorrectionDeps } from './saleCorrection'
import type { DrugReturn } from '../types/sale'

function fakes(overrides: Partial<CorrectionDeps> = {}) {
  let n = 0
  const deps: CorrectionDeps = {
    voidSale: vi.fn().mockResolvedValue({ ok: true }),
    createReturn: vi.fn().mockResolvedValue({ id: 'r1', refund: 10 } as DrugReturn),
    stockChanged: vi.fn(),
    newRequestId: vi.fn(() => `return-${++n}`),
    ...overrides,
  }
  return deps
}

const sale = { id: 's1' }
const line = { sale_item_id: 'i1', qty: 1 }

describe('saleCorrections', () => {
  it('a void brings stock up to date without the caller asking', async () => {
    const deps = fakes()
    await saleCorrections(deps).void(sale, '  ลูกค้าเปลี่ยนใจ ')
    expect(deps.voidSale).toHaveBeenCalledWith('s1', 'ลูกค้าเปลี่ยนใจ')
    expect(deps.stockChanged).toHaveBeenCalledTimes(1)
  })

  it('a void without a reason is refused before it is sent', async () => {
    const deps = fakes()
    await expect(saleCorrections(deps).void(sale, ' ')).rejects.toBeInstanceOf(CorrectionRefused)
    expect(deps.voidSale).not.toHaveBeenCalled()
  })

  it('a refused void does not touch stock', async () => {
    const deps = fakes({ voidSale: vi.fn().mockRejectedValue(new Error('already voided')) })
    await expect(saleCorrections(deps).void(sale, 'x')).rejects.toThrow('already voided')
    expect(deps.stockChanged).not.toHaveBeenCalled()
  })

  it('a return sends only the lines being returned and brings stock up to date', async () => {
    const deps = fakes()
    await saleCorrections(deps).returnItems(sale, [line, { sale_item_id: 'i2', qty: 0 }], 'ยาผิด')
    expect(deps.createReturn).toHaveBeenCalledWith('s1', { items: [line], reason: 'ยาผิด', client_request_id: 'return-1' })
    expect(deps.stockChanged).toHaveBeenCalledTimes(1)
  })

  it('a retry of the same return reuses its request id; a different return gets a new one', async () => {
    const createReturn = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue({ id: 'r1' } as DrugReturn)
    const deps = fakes({ createReturn })
    const corrections = saleCorrections(deps)
    await expect(corrections.returnItems(sale, [line], 'ยาผิด')).rejects.toThrow('network')
    await corrections.returnItems(sale, [line], 'ยาผิด')
    await corrections.returnItems(sale, [line], 'ยาผิด')
    const ids = createReturn.mock.calls.map((c) => c[1].client_request_id)
    expect(ids).toEqual(['return-1', 'return-1', 'return-2'])
  })

  it('a return with nothing to return or no reason is refused', async () => {
    const corrections = saleCorrections(fakes())
    await expect(corrections.returnItems(sale, [{ sale_item_id: 'i1', qty: 0 }], 'x')).rejects.toBeInstanceOf(CorrectionRefused)
    await expect(corrections.returnItems(sale, [line], ' ')).rejects.toBeInstanceOf(CorrectionRefused)
  })
})
