import { ApiError, apiFetch } from './client'
import type { SaleInput, SaleResponse } from '../types/sale'

/**
 * The HTTP adapter of sale submission (lib/pendingSales). Network only: it
 * never queues, so a replay can never enqueue another sale.
 */

/** POST a sale. The server returns the recorded sale for a repeated client_request_id. */
export const postSale = (data: SaleInput) =>
  apiFetch<SaleResponse>('/api/pharmacy/v1/sales', { method: 'POST', body: JSON.stringify(data) })

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
