import { apiFetch } from './client'
import { Sale, SaleItem, SaleInput, SaleResponse, DrugReturn, DrugReturnInput } from '../types/sale'
import { enqueueSale } from '../lib/offlineQueue'

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

/**
 * Direct API call — used internally by useOfflineSync when flushing the queue.
 * Always hits the network; never queues.
 */
export const _createSaleRaw = (data: SaleInput) =>
  apiFetch<SaleResponse>('/api/pharmacy/v1/sales', { method: 'POST', body: JSON.stringify(data) })

/**
 * Offline-aware createSale.
 * - Online  → POST /api/pharmacy/v1/sales normally
 * - Offline → enqueue in IndexedDB, return a temporary receipt
 */
export async function createSale(data: SaleInput): Promise<SaleResponse> {
  if (navigator.onLine) return _createSaleRaw(data)

  const id    = await enqueueSale(data)
  const total = data.items.reduce((s, i) => s + i.price * i.qty, 0) - (data.discount ?? 0)
  return {
    bill_no:  `OFFLINE-${id.slice(-8)}`,
    total:    Math.max(0, total),
    discount: data.discount ?? 0,
    change:   Math.max(0, data.received - Math.max(0, total)),
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
