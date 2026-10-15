import { describe, expect, it, vi } from 'vitest'
import { IMPORT_BATCH, prepareImport, runImport, type ImportLine } from './drugImport'
import type { BulkImportResult } from '../api/drugs'

const lines = (n: number, firstRow = 2): ImportLine[] => {
  const prepared = prepareImport(Array.from({ length: n }, (_, i) => ({ row: firstRow + i, draft: { name: `ยา ${i}` } })))
  if (!prepared.ok) throw new Error(prepared.problem)
  return prepared.lines
}

describe('prepareImport', () => {
  it('checks every row the same way, whatever the file format', () => {
    const got = prepareImport([
      { row: 2, draft: { name: 'Para' } },
      { row: 3, draft: { name: 'Amox', report_types: 'ky 99' } },
    ])
    expect(got).toEqual({ ok: false, row: 3, problem: expect.stringContaining('ky 99') })
  })

  it('applies the format defaults', () => {
    const got = prepareImport([{ row: 1, draft: { name: 'Mask' } }], { type: 'ยาสามัญ', unit: 'ชิ้น' })
    expect(got.ok && got.lines[0].input.unit).toBe('ชิ้น')
  })
})

describe('runImport', () => {
  it('sends at most one server batch at a time', async () => {
    const send = vi.fn(async (batch: unknown[]): Promise<BulkImportResult> => ({ imported: batch.length, errors: [] }))
    const got = await runImport(lines(IMPORT_BATCH + 5), send)
    expect(send.mock.calls.map(c => c[0].length)).toEqual([IMPORT_BATCH, 5])
    expect(got).toMatchObject({ imported: IMPORT_BATCH + 5, failure: null, notSent: 0 })
  })

  it('reports a refused row by its row in the file, in every batch', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce({ imported: IMPORT_BATCH - 1, errors: [{ row: 2, name: 'ยา 0', message: 'ซ้ำ' }] })
      .mockResolvedValueOnce({ imported: 0, errors: [{ row: 3, name: 'x', message: 'ซ้ำ' }] })
    const got = await runImport(lines(IMPORT_BATCH + 2, 10), send)
    expect(got.errors.map(e => e.row)).toEqual([10, 10 + IMPORT_BATCH + 1])
  })

  it('keeps what earlier batches recorded when a later batch fails', async () => {
    const send = vi.fn()
      .mockResolvedValueOnce({ imported: IMPORT_BATCH, errors: [] })
      .mockRejectedValueOnce(new Error('offline'))
    const progress = vi.fn()
    const got = await runImport(lines(IMPORT_BATCH * 2 + 3), send, progress)
    expect(got.imported).toBe(IMPORT_BATCH)
    expect((got.failure as Error).message).toBe('offline')
    expect(got.notSent).toBe(IMPORT_BATCH + 3)
    expect(send).toHaveBeenCalledTimes(2)
    expect(progress).toHaveBeenCalledWith(IMPORT_BATCH, IMPORT_BATCH * 2 + 3)
  })
})
