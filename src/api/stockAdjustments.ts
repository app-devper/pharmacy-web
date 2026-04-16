import { apiFetch } from './client'
import type { Drug } from '../types/drug'
import type { StockAdjustment, StockAdjustmentInput } from '../types/stockAdjustment'

export const createAdjustment = (drugId: string, data: StockAdjustmentInput) =>
  apiFetch<Drug>(`/api/drugs/${drugId}/adjustments`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const getAdjustments = (drugId: string) =>
  apiFetch<StockAdjustment[]>(`/api/drugs/${drugId}/adjustments`)
