import { apiFetch } from './client'
import type { MovementsResponse } from '../types/movement'

export interface MovementsParams {
  from?: string
  to?: string
  drug_name?: string
  types?: string       // comma-separated: import,sale,return,adjustment,writeoff
  limit?: number
  offset?: number
}

export function getMovements(params: MovementsParams = {}): Promise<MovementsResponse> {
  const q = new URLSearchParams()
  if (params.from)      q.set('from',      params.from)
  if (params.to)        q.set('to',        params.to)
  if (params.drug_name) q.set('drug_name', params.drug_name)
  if (params.types)     q.set('types',     params.types)
  if (params.limit  != null) q.set('limit',  String(params.limit))
  if (params.offset != null) q.set('offset', String(params.offset))
  return apiFetch<MovementsResponse>(`/api/movements?${q.toString()}`)
}
