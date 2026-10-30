import { apiFetch } from './client'
import type { Sale, SaleItem, DrugReturn, DrugReturnInput } from '../types/sale'

export interface SalesFilter {
  limit?: number
  from?: string   // YYYY-MM-DD
  to?: string     // YYYY-MM-DD
  q?: string      // bill_no or customer_name
}

// Submitting a sale (confirmed or kept pending) belongs to lib/pendingSales.

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

export const getSaleItems = (saleId: string) =>
  apiFetch<SaleItem[]>(`/api/pharmacy/v1/sales/${saleId}/items`)

export const createReturn = (saleId: string, data: DrugReturnInput) =>
  apiFetch<DrugReturn>(`/api/pharmacy/v1/sales/${saleId}/return`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const getReturns = (saleId: string) =>
  apiFetch<DrugReturn[]>(`/api/pharmacy/v1/sales/${saleId}/returns`)
