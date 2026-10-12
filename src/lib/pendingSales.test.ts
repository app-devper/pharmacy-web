import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, IdentityUnavailableError } from '../api/client'
import type { SaleInput, SaleResponse } from '../types/sale'

vi.mock('../api/salesTransport', () => ({ postSale: vi.fn(), abandonQueued: vi.fn() }))
vi.mock('../api/kyforms', () => ({ addKy10: vi.fn(), addKy11: vi.fn(), addKy12: vi.fn() }))

const { postSale } = await import('../api/salesTransport')
const { addKy10 } = await import('../api/kyforms')
const { getPendingSales, removePendingSale, putPendingSale } = await import('./offlineQueue')
const { SaleAttempt, listPendingSales, submitSale, syncAll } = await import('./pendingSales')

const post = vi.mocked(postSale)
const recorded = (bill: string): SaleResponse => ({ id: 's1', bill_no: bill, total: 20, discount: 0, change: 0 })
const sale = (qty = 2): SaleInput => ({ items: [{ drug_id: 'd1', qty, price: 10 }], received: 20 })
const online = (on: boolean) => vi.stubGlobal('navigator', { onLine: on })

beforeEach(async () => {
  post.mockReset()
  vi.mocked(addKy10).mockReset()
  online(true)
  for (const e of (await getPendingSales()) as { id: string }[]) await removePendingSale(e.id)
})

describe('submitSale', () => {
  it('returns the sale the server recorded', async () => {
    post.mockResolvedValue(recorded('INV-1'))
    const out = await submitSale(new SaleAttempt().intent(sale()))
    expect(out).toEqual({ status: 'confirmed', sale: recorded('INV-1') })
    expect(await listPendingSales()).toHaveLength(0)
  })

  it('keeps a sale pending on a 5xx and replays it under the same request id', async () => {
    const intent = new SaleAttempt().intent(sale())
    post.mockRejectedValueOnce(new ApiError('bad gateway', 502))
    const out = await submitSale(intent)
    expect(out.status).toBe('pending')
    if (out.status === 'pending') expect(out.receipt.total).toBe(20)

    post.mockResolvedValueOnce(recorded('INV-1'))
    expect(await syncAll()).toEqual({ recorded: 1, refused: 0, outage: null })
    expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ client_request_id: intent.client_request_id }))
    expect(await listPendingSales()).toHaveLength(0)
  })

  it('keeps a sale pending during an identity outage', async () => {
    post.mockRejectedValueOnce(new IdentityUnavailableError())
    expect((await submitSale(new SaleAttempt().intent(sale()))).status).toBe('pending')
  })

  it('keeps a sale pending without calling the server when offline', async () => {
    online(false)
    expect((await submitSale(new SaleAttempt().intent(sale()))).status).toBe('pending')
    expect(post).not.toHaveBeenCalled()
  })

  it('throws a refusal and keeps nothing', async () => {
    post.mockRejectedValueOnce(new ApiError('insufficient stock', 400))
    await expect(submitSale(new SaleAttempt().intent(sale()))).rejects.toThrow('insufficient stock')
    expect(await listPendingSales()).toHaveLength(0)
  })
})

describe('SaleAttempt', () => {
  it('keeps one id for the same sale and a new one when it changes or is done', () => {
    const a = new SaleAttempt()
    const first = a.intent(sale()).client_request_id
    expect(a.intent(sale()).client_request_id).toBe(first)
    expect(a.intent({ ...sale(), client_request_id: 'stale' }).client_request_id).toBe(first)
    const changed = a.intent(sale(3)).client_request_id
    expect(changed).not.toBe(first)
    a.done()
    expect(a.intent(sale(3)).client_request_id).not.toBe(changed)
  })
})

describe('replay', () => {
  it('marks a sale the server refuses as a conflict and carries on', async () => {
    online(false)
    await submitSale(new SaleAttempt().intent(sale(1)))
    await submitSale(new SaleAttempt().intent(sale(2)))
    online(true)
    post.mockRejectedValueOnce(new ApiError('closed day', 409)).mockResolvedValueOnce(recorded('INV-2'))
    expect(await syncAll()).toEqual({ recorded: 1, refused: 1, outage: null })
    const left = await listPendingSales()
    expect(left.map(e => e.state)).toEqual(['conflict'])
  })

  it('stops at the first temporary failure', async () => {
    online(false)
    await submitSale(new SaleAttempt().intent(sale(1)))
    await submitSale(new SaleAttempt().intent(sale(2)))
    online(true)
    post.mockRejectedValueOnce(new IdentityUnavailableError())
    expect(await syncAll()).toEqual({ recorded: 0, refused: 0, outage: 'identity' })
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('keeps legacy KY records pending, not refused, when the server fails with a 5xx', async () => {
    await putPendingSale({
      id: 'legacy', created_at: 1, data: { ...sale(), client_request_id: 'legacy' },
      ky: [{ form: 'ky10', data: { date: '2026-05-17', drug_name: 'x', reg_no: '', qty: 1, unit: '', buyer_name: 'B', buyer_address: 'A', rx_no: '', doctor: '', balance: 0 } }],
    })
    post.mockResolvedValue(recorded('INV-9'))
    vi.mocked(addKy10).mockRejectedValueOnce(new ApiError('boom', 500))
    await syncAll()
    const [entry] = await listPendingSales()
    expect(entry.state).toBe('pending')
  })
})
