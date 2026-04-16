import { apiFetch } from './client'

export interface ExpiringLot {
  id: string
  drug_id: string
  drug_name: string
  lot_number: string
  expiry_date: string
  remaining: number
  days_left: number
}

export const getExpiringLots = (days = 60) =>
  apiFetch<ExpiringLot[]>(`/api/lots/expiring?days=${days}`)

export const getExpiredLots = () =>
  apiFetch<ExpiringLot[]>(`/api/lots/expiring?expired_only=true`)

export const writeoffLots = (lotIds: string[]) =>
  apiFetch<{ written_off: number }>('/api/lots/writeoff', {
    method: 'POST',
    body: JSON.stringify({ lot_ids: lotIds }),
  })
