import { apiFetch } from './client'
import type { ExpiringLot } from '../types/lot'

export type { ExpiringLot }

export const getExpiringLots = (days = 60) =>
  apiFetch<ExpiringLot[]>(`/api/lots/expiring?days=${days}`)

export const getExpiredLots = () =>
  apiFetch<ExpiringLot[]>(`/api/lots/expiring?expired_only=true`)

export const writeoffLots = (lotIds: string[]) =>
  apiFetch<{ written_off: number }>('/api/lots/writeoff', {
    method: 'POST',
    body: JSON.stringify({ lot_ids: lotIds }),
  })
