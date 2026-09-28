import { ApiError, apiFetch, isTemporaryOutage } from './client'
import { Sale, SaleItem, SaleInput, SaleResponse, DrugReturn, DrugReturnInput } from '../types/sale'
import { enqueueSale, newSaleRequestId } from '../lib/offlineQueue'
import { kyRecordLabel, submitKyRecords, type KyRecord } from '../lib/kyRecords'

export interface SalesFilter {
  limit?: number
  from?: string   // YYYY-MM-DD
  to?: string     // YYYY-MM-DD
  q?: string      // bill_no or customer_name
}

export function getSales(filter: SalesFilter = {}) {
  const p = new URLSearchParams()
  if (filter.limit)  p.set('limit', String(filter.limit))
  if (filter.from)   p.set('from',  filter.from)
  if (filter.to)     p.set('to',    filter.to)
  if (filter.q)      p.set('q',     filter.q)
  const qs = p.toString()
  return apiFetch<Sale[]>(`/api/pharmacy/v1/sales${qs ? `?${qs}` : ''}`)
}

/** Void (cancel) a sale — restores stock and reverses customer spend on the backend. */
export const voidSale = (id: string, reason: string) =>
  apiFetch<{ ok: boolean }>(`/api/pharmacy/v1/sales/${id}/void`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })

export type AbandonOutcome = { abandoned: true } | { abandoned: false; sale: SaleResponse }

/**
 * Record that a queued sale will never be recorded, or close a recorded
 * sale's refused KY records (ADMIN+, pharmacy-api ADR-0009). A queued sale the
 * server recorded meanwhile comes back as `{abandoned: false, sale}`.
 */
export async function abandonQueued(
  clientRequestId: string, kind: 'sale' | 'ky_forms', payload: unknown, reason: string,
): Promise<AbandonOutcome> {
  try {
    await apiFetch('/api/pharmacy/v1/sales/abandon', {
      method: 'POST',
      body: JSON.stringify({ client_request_id: clientRequestId, kind, payload, reason }),
    })
    return { abandoned: true }
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      const sale = recordedSale(e.body)
      if (sale) return { abandoned: false, sale }
    }
    throw e
  }
}

function recordedSale(body: string): SaleResponse | null {
  try {
    const parsed = JSON.parse(body) as { sale?: SaleResponse }
    return parsed.sale?.bill_no ? parsed.sale : null
  } catch {
    return null
  }
}

/**
 * Direct API call — used internally by pendingSales when flushing the queue.
 * Always hits the network; never queues.
 */
export const _createSaleRaw = (data: SaleInput) =>
  apiFetch<SaleResponse>('/api/pharmacy/v1/sales', { method: 'POST', body: JSON.stringify(data) })

const OFFLINE_BILL_PREFIX = 'OFFLINE-'

/**
 * Offline-aware createSale.
 * - Online  → POST /api/pharmacy/v1/sales normally
 * - Offline → enqueue in IndexedDB, return a temporary receipt
 * - Online but the request fails temporarily (the network drops, or the
 *   server cannot confirm the session, ADR-0016) → queue it like an offline
 *   sale; pendingSales replays it later.
 *
 * The sale gets its client_request_id before the first attempt. If the
 * network dropped after the server recorded the sale, the replay carries the
 * same id and pharmacy-api returns the existing sale instead of a duplicate.
 *
 * KY records (`ky`) are sent after the bill is confirmed, with its sale id.
 * If the bill is queued, or the connection drops while sending them, the
 * records wait in the queue with the bill instead of being lost.
 */
export async function createSale(data: SaleInput, ky: KyRecord[] = []): Promise<SaleResponse> {
  const request = { ...data, client_request_id: data.client_request_id || newSaleRequestId() }
  if (!navigator.onLine) return queueSale(request, ky)
  let result: SaleResponse
  try {
    result = await _createSaleRaw(request)
  } catch (e) {
    if (isTemporaryOutage(e)) return queueSale(request, ky)
    throw e
  }
  if (ky.length === 0) return result
  const sent = await submitKyRecords(result.id, ky)
  if (sent.unsent.length > 0) await enqueueSale(request, sent.unsent)
  return { ...result, ky_pending: sent.unsent.length, ky_failed: sent.failed.map(kyRecordLabel) }
}

/** True when createSale queued the sale instead of confirming it with the server. */
export const isQueuedReceipt = (r: SaleResponse) => r.bill_no.startsWith(OFFLINE_BILL_PREFIX)

async function queueSale(data: SaleInput, ky: KyRecord[]): Promise<SaleResponse> {
  const id    = await enqueueSale(data, ky)
  const total = data.items.reduce((s, i) => s + i.price * i.qty, 0) - (data.discount ?? 0)
  return {
    bill_no:  `${OFFLINE_BILL_PREFIX}${id.slice(-8)}`,
    total:    Math.max(0, total),
    discount: data.discount ?? 0,
    change:   Math.max(0, data.received - Math.max(0, total)),
    ky_pending: ky.length,
  }
}

export const getSaleItems = (saleId: string) =>
  apiFetch<SaleItem[]>(`/api/pharmacy/v1/sales/${saleId}/items`)

export const createReturn = (saleId: string, data: DrugReturnInput) =>
  apiFetch<DrugReturn>(`/api/pharmacy/v1/sales/${saleId}/return`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const getReturns = (saleId: string) =>
  apiFetch<DrugReturn[]>(`/api/pharmacy/v1/sales/${saleId}/returns`)
